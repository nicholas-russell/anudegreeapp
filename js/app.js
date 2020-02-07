/**
 * ANU Degree Planner
 *
 * The JavaScript for the (unofficial) ANU Degree planner!
 *
 * @link https://www.github.com/nicholas-russell/anudegree
 * @author Nicholas Russell
 * @version 0.2
 *
 * */

/*********************************
    CONSTANTS
 *********************************/
const DATA_UPDATED = "03/01/2020";
const DATA_VERSION = 1;
const APP_VERSION = 0.2;
const DATA_NAMES = ["courses", "majors", "minors", "programs"];

const START_YEAR_OPTIONS = 2017;
const CURRENT_YEAR_OPTIONS = 2020;
const END_YEAR_OPTIONS = 2025;

const DEFAULT_SESSION_ORDER = ["First Semester","Second Semester","Summer Session","Winter Session","Autumn Session","Spring Session"];
const TIME_SESSION_ORDER = ["First Semester","Autumn Session","Winter Session","Second Semester","Spring Session","Summer Session"];
const GRADE_MARKS = [7,6,5,4,0];
const GRADE_LABELS = ["HD","D","C","P","N"];
const DATA_LEVEL_TYPES = {
    YEAR: "year",
    SESSION: "session",
    COURSE: "course"
};

/*********************************
    HELPER FUNCTIONS
 *********************************/
/**
 * Downloads the content when called;
 * @param content The contents of the file to be downloaded
 * @param fileName The name of the file to be downloaded
 * @param mimeType Content type (eg. application/json)
 */
function downloadFile(content, fileName, mimeType) {
    let a = document.createElement('a');
    mimeType = mimeType || 'application/octet-stream';

    if (navigator.msSaveBlob) { // IE10
        navigator.msSaveBlob(new Blob([content], {
            type: mimeType
        }), fileName);
    } else if (URL && 'download' in a) { //html5 A[download]
        a.href = URL.createObjectURL(new Blob([content], {
            type: mimeType
        }));
        a.setAttribute('download', fileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        location.href = 'data:application/octet-stream,' + encodeURIComponent(content); // only this mime type is supported
    }
}

/**
 * jQuery plugin to fade out and remove element.
 * @param speed Time to fade.
 */
jQuery.fn.fadeOutAndRemove = function(speed){
    $(this).fadeOut(speed,function(){
        $(this).remove();
    })
};
/**
 * Initialises tooltips.
 */
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
});

/**
 * Returns GPA average
 * @param counts An array of size 5 with counts of each grade (eg. [1, 2, 0, 1, 0] is 1 HD, 2 D's and 1 P)
 * @returns {string} A rounded GPA
 */
function calculateGPA(counts) {
    let totalCourses = 0;
    let totalMarks = 0;
    _.each(counts, (e,i) => {
        totalCourses += e;
        totalMarks += gradeMarks[i] * e;
    });
    return (totalCourses === 0 ? "0.0" : (totalMarks/totalCourses).toFixed(1));
}

/**
 * Calculates WAM given an array of marks
 * @param marks An array of marks
 * @returns {string} A rounded number corresponding to WAM
 */
function calculateWam(marks) {
    let sum = 0;
    let size = marks.length;
    _.each(marks, (e)=> {
        sum += Number(e);
    });
    return (size === 0 ? "0.00" : (sum/size).toFixed(2));
}

/**
 * Returns a letter grade given a mark
 * @param mark The number for the mark
 * @returns {string} The letter grade
 */
function getGradeFromMark(mark) {
    if (mark >= 80) {
        return gradeLabels[0];
    } else if (mark >= 70 && mark < 80) {
        return gradeLabels[1];
    } else if (mark >= 60 && mark < 70) {
        return gradeLabels[2];
    } else if (mark >= 50 && mark <60) {
        return gradeLabels[3];
    } else if (mark < 50) {
        return gradeLabels[4];
    } else if (mark === "") {
        return "";
    } else {
        return "Err";
    }
}

/**
 * Returns the minimum grades required to reach a goal GPA, given
 * a current GPA and number of units completed.
 *
 * @param grades A size 5 array, with elements 1-4 being 0 and the 5th the number of possible classes
 * to achieve the goalGPA
 * @param goalGpa The GPA to reach
 * @param currentGpa Current GPA
 * @param unitsCompleted Units currently completed
 * @param unitsAvailable Units available to go.
 * @returns {{result: boolean, gpa: string, grades: *}}
 */
function getMinimumGradesForGPA(grades,goalGpa,currentGpa,unitsCompleted, unitsAvailable) {
    let gpa = (this.calculateGPA(grades)*unitsAvailable + (currentGpa*unitsCompleted))/(unitsAvailable + unitsCompleted);
    if (gpa >= goalGpa) {
        return {gpa: gpa.toFixed(3), grades: grades, result: true};
    } else if (grades[0] === unitsAvailable) {
        return {gpa: gpa.toFixed(3), grades: grades, result: false};
    } else {
        let w = 0;
        $.each(grades, (i,e)=>{
            if (e !== 0) {
                if (i === 4) {
                    w = i;
                    return false;
                } else if (grades[i+1] === 0) {
                    w = i;
                    return false;
                } else {
                    return true;
                }
            }
        });
        if (w !== 0) {
            grades[w]--;
            grades[w-1]++;
        }
        return this.getMinimumGrades(grades,goalGpa,currentGpa,unitsCompleted,unitsAvailable);
    }

}

/**
 * Sets options for an <select> element
 * @param jQuerySelector The jQuery object for the <select>
 * @param array Array of options
 * @param selected Which option to select
 * @param sort A boolean to sort or not
 */
function setInputOptions(jQuerySelector, array, selected, sort=false) {
    if (sort) {
        array.sort();
    }
    let output = [];
    $.each(array, function(key, value)
    {
        let option;
        if (value === selected) {
            option = '<option selected value=\"'+ value +'\">'+ value +'</option>';
        } else {
            option = '<option value=\"'+ value +'\">'+ value +'</option>';
        }
        output.push(option);
    });
    jQuerySelector.empty();
    jQuerySelector.html(output.join(''));
}

// TODO: find way to implemented this in the same way as HTML tables
/**
 * Generates CSV Table
 * @param data
 * @param colLabel
 * @param rowTotal
 * @param colTotal
 * @param sort
 * @returns {string}
 */
function generateCSVTable(data, colLabel, rowTotal, colTotal, sort) {
    let rows = [];
    let headers = [];
    let colTotals = {};
    let total = 0;
    let rtn = "";
    for (let a of Object.keys(data)) {
        rows.push(a);
        for (let b of Object.keys(data[a])) {
            if (_.indexOf(headers, b) === -1) {
                headers.push(b);
            }
        }
    }
    if (sort !== null) {
        headers.sort(sort);
    }
    rtn += `${colLabel},`;
    for (let a of headers) {
        rtn += a;
        if (_.last(headers) !== a) {
            rtn += ',';
        }
    }
    if (rowTotal) {
        rtn += ",Total";
    }
    rtn+= "\n";

    for (let a of rows) {
        let rowTotal = 0;
        rtn += `${a},`;
        for (let b of headers) {
            let x = data[a].hasOwnProperty(b) ? data[a][b] : 0;
            rowTotal += x;
            colTotals[b] = colTotals.hasOwnProperty(b) ? colTotals[b] + x : x;
            rtn += x;
            if (_.last(headers) !== b) {
                rtn += ',';
            }
        }
        total += rowTotal;
        rtn += rowTotal ? `,${rowTotal}\n` : '\n';
    }

    if (colTotal) {
        rtn+= 'Total,';
        for (let a of headers) {
            rtn += colTotals[a];
            if (_.last(headers) !== a) {
                rtn += ',';
            }
        }
        if (rowTotal) {
            rtn += `,${total}`;
        }
        rtn += '\n';
    }
    return rtn;
}

function generateHtmlTable(data, colLabel, rowTotal, colTotal, sort) {
    let rows = [];
    let headers = [];
    let colTotals = {};
    let total = 0;
    let html = "";
    let cssTotal = "total";
    for (let a of Object.keys(data)) {
        rows.push(a);
        for (let b of Object.keys(data[a])) {
            if (_.indexOf(headers, b) === -1) {
                headers.push(b);
            }
        }
    }
    if (sort !== null) {
        headers.sort(sort);
    }
    html += `<thead><th scope='col'>${colLabel}</th>`;
    for (let a of headers) {
        html += `<th scope='col'>${a}</th>`;
    }
    if (rowTotal) html += `<th class="${cssTotal}" scope='col'>Total</th>`;
    html += "</thead>";

    for (let a of rows) {
        let rowTotal = 0;
        html += `<tr><th scope="row">${a}</th>`;
        for (let b of headers) {
            let x = data[a].hasOwnProperty(b) ? data[a][b] : 0;
            rowTotal += x;
            colTotals[b] = colTotals.hasOwnProperty(b) ? colTotals[b] + x : x;
            html += `<td>${x}</td>`;
        }
        total += rowTotal;
        html += rowTotal ? `<td class="${cssTotal}">${rowTotal}</td>` : '';
        html += '</tr>';
    }

    if (colTotal) {
        html += `<tr class="${cssTotal}"><th scope="col">Total</th>`;
        for (let a of headers) {
            html += `<td>${colTotals[a]}</td>`;
        }
        if (rowTotal) {
            html += `<td>${total}</td>`;
        }
        html += `</tr>`;
    }
    return html;
}

/*********************************
    DATA TYPE DECLARATIONS
 *********************************/
function Year(name, dataName) {
    return {
        name: name,
        dataSrc: dataName,
        type: LEVEL_TYPES.YEAR,
        sessions: []
    }
}

function Session(name, dataName) {
    return {
        name: name,
        dataSrc: dataName,
        type: LEVEL_TYPES.SESSION,
        courses: []
    }
}

function Course(code, mark=undefined) {
    return {
        code: code,
        mark: mark
    }
}


/*********************************
    CLASSES
 *********************************/
class Model {
    constructor() {
        this.store = {
            years: [],
            requirements: {}
        };
        this.data = {
            courses: {},
            majors: {},
            minors: {},
            programs: {},
        };
    }

    _commit() {
        // saves current store to localStorage
    }

    loadData() {
        // loads in data from JSON files via ajax
    }

    setMarkForCourse(year, session, code, courseMark) {
        // set mark for course
    }
    
    getMarkForCourse(year, session, code) {
        // get mark for course
    }

    addYear(year, dataSource=year) {
        // add new year
    }

    getYearIndex(year) {
        
    }
    
    removeYear(year) {
        // removes year from store
    }

    addSession(year, session, forceAdd=false, dataSource=session) {
        // add new session
    }

    getSessionIndex(year, session, yearIndexValue=undefined) {
        
    }
    
    removeSession(year, session) {
        // remove session
    }

    addCourse(year, session, code, forceAdd=false, mark=undefined) {
        // add course
    }
    
    removeCourse(year, session, code) {
        // remove course
    }
    
    getCourseData(year, code) {
        // returns a data model for the course
    }
    
    getNewYearOptions() {
        // returns possible new year combinations
    }
    
    getNewSessionOptions(year) {
        // gets possible sessions given year
    }
    
    getCurrentYears() {
        // returns list of current new years
    }
    
    isCourseAvailableInSession(year, session, code) {
        // is the course available in the current session
    }

    isSessionEmpty(year, session) {
        // checks if session is empty
    }

    isYearEmpty(year) {
        // checks if year is empty
    }

    getDataSummary() {
        // returns summary by code and session
    }

    isCourseCompleted(year, session, code) {
        // is the course been completed by this year/session
    }

    getTableForPDF() {
        // gets a table for the PDF
    }

    getSearchItemsForPlans(year) {
        // returns combined list of majors, minors and programs
    }

    getSearchItemsForCourses(year, sessions, codes, careers) {
        // returns a filtered list given the above conditions
    }

    getCSV() {
        // returns CSV of store data
    }

    _cachePlan() {
        // commits requirements
    }

    getCachedPlan() {
        // loads cached requirements
    }

    setPlanCache(year, code, html, planType) {
        // caches requirements
    }

    resetPlanCache() {
        // resets requirement cache
    }
    
    isPlanCached(year, code) {
        // checks if requirements is available in the cache
    }
    
    getCachedPlanHtml(year, code) {
        // gets requirement cache
    }
    
    getCachedPlans(year, code) {
        // returns a list of codes
    }

}

class View {
    constructor() {
        this.page = {
            // all jQuery selectors here
            templates: {

            },
            modals: {

            },

        }
    }

    addYear(year) {
        // adds year tab
    }

    removeYear(year) {
        // removes year tab
    }

    showTab(year) {
        // show tab
    }

    addSession(year, session) {
        // adds session table
    }

    removeSession(year, session) {
        // removes session table
    }

    addCourse(year, session, code) {
        // adds course to table
    }

    removeCourse(year, session, course) {
        // removes course from table
    }

    checkRequirements(selector, year, session, mode="course") {
        // checks div for course codes and then if they are complete
    }

    getUnitSummaryHTML(data) {
        // returns HTML data for code and session summary tables
    }

    updateGPAFields(selector, value) {
        // TODO: refactor - do we need value?
    }

    getGPAGradeCounts() {

    }

    renderWAMTable(data) {

    }

    renderWAMTableResults(manual, firstYear) {

    }

    addRowToWAMManualTable() {

    }

}

class Controller {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.currentYear = 2020;
        this.currentSession = "First Semester";
        this.registerEvents();
        this.loadStore();
    }

    async loadStore() {

    }

    registerEvents() {

    }
}

const app = new Controller(new Model(), new View());