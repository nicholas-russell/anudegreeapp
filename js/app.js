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
const DATA_VERSION = 2;
const APP_VERSION = 0.2;
const DATA_NAMES = ["courses", "majors", "minors", "programs"];

const START_YEAR_DATA = "2017";
const CURRENT_YEAR = "2020";
const END_YEAR_DATA= "2020";

const YEAR_LIST = ["STE", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
const DEFAULT_SESSION_ORDER = ["First Semester","Second Semester","Summer Session","Winter Session","Autumn Session","Spring Session"];
const TIME_SESSION_ORDER = ["First Semester","Autumn Session","Winter Session","Second Semester","Spring Session","Summer Session"];
const GRADE_MARKS = [7,6,5,4,0];
const GRADE_LABELS = ["HD","D","C","P","N"];
const DATA_LEVEL_TYPES = {
    YEAR: "year",
    SESSION: "session",
    COURSE: "course"
};
const RETURN_CODES = {
    NOT_EXISTS: {
        YEAR: -102,
        SESSION: -103,
        COURSE: -105
    },
    EXISTS_ALREADY: {
        YEAR: -105,
        SESSION: -106,
        COURSE: -107
    },
    REMOVED: {
        YEAR: -108,
        SESSION: -109,
        COURSE: -110
    },
    DATA_NOT_FOUND: {
        COURSE_MODEL: -111,
    }
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

function getDataSource(year) {
    if (year > END_YEAR_DATA) {
        return END_YEAR_DATA;
    } else if(year < START_YEAR_DATA) {
       return START_YEAR_DATA;
    } else {
        return year;
    }
}

/*********************************
    DATA TYPE DECLARATIONS
 *********************************/
function Year(name, dataName) {
    return {
        name: name,
        dataSrc: dataName,
        type: DATA_LEVEL_TYPES.YEAR,
        sessions: []
    }
}

function Session(name) {
    return {
        name: name,
        type: DATA_LEVEL_TYPES.SESSION,
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
        this.data = {};
    }

    _commit() {
        // saves current store to localStorage
        localStorage.setItem('degree_plan', JSON.stringify(this.store));
    }

    setMarkForCourse(year, session, code, courseMark) {
        // set mark for course
    }
    
    getMarkForCourse(year, session, code) {
        // get mark for course
    }

    /**
     * Adds a year to the model store
     * @param year The year to add
     * @param dataSource The year to source data from, default to same as year
     * @returns {number} Returns index of added year, or -1 if year already exists.
     */
    addYear(year, dataSource=getDataSource(year)) {
        if (this.getYearIndex(year) === RETURN_CODES.NOT_EXISTS.YEAR) {
            return this.store.years.push(Year(year, dataSource)) -1;
        } else {
            console.warn(`${year} already exists`);
            return RETURN_CODES.EXISTS_ALREADY.YEAR;
        }
    }

    /**
     * Gets the index of the year in the store.years array
     * @param year The yearName to search for
     * @returns {number} The index, or -1 if it doesn't exist.
     */
    getYearIndex(year) {
        let index = _.findIndex(this.store.years, (yearIteration) => {
           return yearIteration.name === year;
        });
        return index === -1 ? RETURN_CODES.NOT_EXISTS.YEAR : index;
    }

    /**
     * Removes a year from the store
     * @param year The year to remove matching the name
     * @returns {number} True if removes, False if it didn't exist
     */
    removeYear(year) {
        let yearIndex = this.getYearIndex(year);
        if (yearIndex === -1) {
            console.warn(`${year} does not exist to remove!`);
            return RETURN_CODES.NOT_EXISTS.YEAR;
        } else {
            this.store.years.splice(yearIndex,1);
            return RETURN_CODES.REMOVED.YEAR;
        }
    }

    /**
     * Adds a session to the store for the given year.
     * @param year The year to add
     * @param session The session name
     * @param yearIndex
     * @param forceAdd {boolean} If true, will add even if the year doesn't exist.
     * @returns {number} Index of added session, -1 if session exists, -2 if year doesn't exist
     */
    addSession(year, session, yearIndex=this.getYearIndex(year), forceAdd=false) {
        if (yearIndex === RETURN_CODES.NOT_EXISTS.YEAR) {
            console.warn(`Warning: ${year} does not exist to add ${session} to`);
            if (forceAdd) {
                console.warn('--> Adding anyway as force is true');
                yearIndex = this.addYear(year);
            } else {
                return RETURN_CODES.NOT_EXISTS.YEAR;
            }
        }
        if (this.getSessionIndex(year, session) === RETURN_CODES.NOT_EXISTS.SESSION) {
            return this.store.years[yearIndex].sessions.push(Session(session)) -1;
        } else {
            return RETURN_CODES.EXISTS_ALREADY.SESSION;
        }
    }

    /**
     * Gets the index of a session in a year
     * @param year The year the session is in
     * @param session The name of the session
     * @param yearIndex The yearIndex, if not defined in function call will get it.
     * @returns {number} Returns index, -2 if year doesn't exist or -1 if the session already exists.
     */
    getSessionIndex(year, session, yearIndex=this.getYearIndex(year)) {
        if (yearIndex === RETURN_CODES.NOT_EXISTS.YEAR) {
            console.warn(`${year} doesn't exist`);
            return RETURN_CODES.NOT_EXISTS.YEAR;
        } else {
            let index = _.findIndex(this.store.years[yearIndex].sessions, (sessionIteration) => {
                return sessionIteration.name === session;
            });
            return index === -1 ? RETURN_CODES.NOT_EXISTS.SESSION : index;
        }
    }

    /**
     * Removes a session from the model.
     * @param year The year the session is in
     * @param session The name of the session
     * @param yearIndex The yearIndex, if not defined in function call will get it.
     * @returns {number} False if year/session doesn't exist, true if removed.
     */
    removeSession(year, session, yearIndex=this.getYearIndex(year)) {
        if (yearIndex === RETURN_CODES.NOT_EXISTS.YEAR) {
            console.warn(`${year} doesn't exist to remove ${session} from!`);
            return RETURN_CODES.NOT_EXISTS.YEAR;
        }
        let sessionIndex = this.getSessionIndex(year, session, yearIndex);
        if (sessionIndex === RETURN_CODES.NOT_EXISTS.SESSION) {
            console.warn(`${session} doesn't exist in ${year} to remove`);
            return RETURN_CODES.NOT_EXISTS.SESSION;
        } else {
            this.store.years[yearIndex].sessions.splice(sessionIndex, 1);
            return RETURN_CODES.REMOVED.SESSION;
        }
    }

    /**
     * Adds a course to the model
     * @param year The year of the session
     * @param session The session to add the course to
     * @param code The code of the course
     * @param forceAdd If true, will add even if year/session doesn't exist.
     * @param mark The mark of the course, if set
     * @returns {number} Index of course added, -2 if year doesn't exist, -1 if session doesn't exist
     */
    addCourse(year, session, code, forceAdd=false, mark=null) {
        let yearIndex = this.getYearIndex(year);
        if (yearIndex === RETURN_CODES.NOT_EXISTS.YEAR) {
            console.warn(`Warning: ${year} does not exist`);
            if (forceAdd) {
                console.warn(`--> Adding ${year} as force is true`);
                yearIndex = this.addYear(year);
            } else {
                return RETURN_CODES.NOT_EXISTS.YEAR;
            }
        }
        let sessionIndex = this.getSessionIndex(year, session,yearIndex);
        if (sessionIndex === RETURN_CODES.NOT_EXISTS.SESSION) {
            console.warn(`Warning: ${year} ${session} does not exist`);
            if (forceAdd) {
                console.warn(`--> Adding ${session} as force is true`);
                sessionIndex = this.addSession(year, session, yearIndex);
            } else {
                return RETURN_CODES.NOT_EXISTS.SESSION;
            }
        }
        return this.store.years[yearIndex].sessions[sessionIndex].courses.push(Course(code, mark)) - 1;
    }

    /**
     * Returns course index given year and session
     * @param year The year the course is in
     * @param session The session the course is in
     * @param code The course code
     * @returns {number} The index, or a return code.
     */
    getCourseIndex(year, session, code) {
        let sessionIndex = this.getSessionIndex(year, session);
        if (sessionIndex >= 0) {
            // session exists, so lets check for the course
            let yearIndex = this.getYearIndex(year);
            let index = _.findIndex(this.store.years[yearIndex].sessions[sessionIndex].courses, (courseIteration) => {
                return courseIteration.code === code;
            });
            return index === -1 ? RETURN_CODES.NOT_EXISTS.COURSE : index;
        } else {
            return sessionIndex;
        }
    }

    /**
     * Removes course from store
     * @param year The year the course is in
     * @param session The session the course is in
     * @param code The course code
     * @returns {number} A return code.
     */
    removeCourse(year, session, code) {
        let courseIndex = this.getCourseIndex(year, session, code);
        if (courseIndex >= 0) {
            let yearIndex = this.getYearIndex(year);
            let sessionIndex = this.getSessionIndex(year, session, yearIndex);
            this.store.years[yearIndex].sessions[sessionIndex].courses.splice(courseIndex, 1);
            return RETURN_CODES.REMOVED.COURSE;
        } else {
            return courseIndex;
        }
    }
    
    getCourseData(year, code) {
        // returns a data model for the course
        let yearIndex = this.getYearIndex(year);
        let dataSource = year;
        if (yearIndex >= 0) {
            dataSource = this.store.years[yearIndex].dataSrc;
        } else {
            dataSource = getDataSource(year);
        }
        console.log(dataSource);
        let courseModel = _.find(this.data.courses[dataSource], (courseIteration) => {
            return courseIteration.c === code;
        });
        if (courseModel === undefined) {
            return RETURN_CODES.DATA_NOT_FOUND.COURSE_MODEL;
        } else {
            return {
                code: courseModel.c,
                name: courseModel.n,
                level: courseModel.l,
                sessions: courseModel.s,
                units: courseModel.u,
            };
        }
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

    loadViewFromSave(data) {
        
    }

    showLocalStorageError(errorMessage) {
        $('#localStorageErrorCode').text(errorMessage);
        $('#localStorageAlert').removeClass("d-none");
        $('.localStorageErrorHide').addClass("d-none");
        $('#getStartedAlert').alert('close');
        $('#mobileAlert').alert('close');
    }

}

class Controller {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.currentYear = 2020;
        this.currentSession = "First Semester";
        this.registerEvents();
        this.loadLocalStorage();
    }

    async loadLocalStorage() {
        await this.loadData();
        localStorage.setItem('data_version', DATA_VERSION);
        let savedStore = JSON.parse(localStorage.getItem('degree_plan'));
        if (savedStore !== null && !$.isEmptyObject(savedStore)) {
            this.model.store = savedStore;
            console.log(`Store has been loaded from localStorage`);
            this.view.loadViewFromSave(this.model.store);
            $('#getStartedAlert').alert('close');
        }
        $('#coursesUpdated').text(`v${APP_VERSION}/${DATA_VERSION}`);
    }

    loadData() {
        // loads in data from JSON files via ajax
        for (let dataName of DATA_NAMES) {
            if (localStorage.getItem(dataName) === null || localStorage.getItem('data_version') < DATA_VERSION) {
                $.ajax({
                    url: `js/data/${dataName}.min.json`,
                    accepts: 'application/json',
                    beforeSend: () => {
                        localStorage.removeItem(dataName);
                    },
                    success: (response) => {
                        console.log(`Loaded ${dataName} from JSON`);
                        try {
                            localStorage.setItem(dataName, JSON.stringify(response));
                            this.model.data[dataName] = response;
                        } catch (error) {
                            this.view.showLocalStorageError(error);
                        }
                    },
                    error: (error) => {
                        console.error(error);
                        this.view.showLocalStorageError(error);
                    }
                });
            } else {
                console.log(`Loaded ${dataName} from localStorage`);
                this.model.data[dataName] = JSON.parse(localStorage.getItem(dataName));
            }
        }
    }

    registerEvents() {

    }
}

const app = new Controller(new Model(), new View());
