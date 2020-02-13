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
const PLAN_TYPES = {
    MAJOR: "Major",
    MINOR: "Minor",
    PROGRAM: "Program"
};
const RETURN_CODES = {
    NOT_EXISTS: {
        YEAR: -401,
        SESSION: -402,
        COURSE: -403,
        PLAN: -404,
    },
    EXISTS_ALREADY: {
        YEAR: -105,
        SESSION: -106,
        COURSE: -107
    },
    REMOVED: {
        YEAR: -201,
        SESSION: -202,
        COURSE: -203
    },
    DATA_NOT_FOUND: {
        COURSE_MODEL: -405,
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
        totalMarks += GRADE_MARKS[i] * e;
    });
    return (totalCourses === 0 ? "0.00" : (totalMarks/totalCourses).toFixed(2));
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
        return GRADE_LABELS[0];
    } else if (mark >= 70 && mark < 80) {
        return GRADE_LABELS[1];
    } else if (mark >= 60 && mark < 70) {
        return GRADE_LABELS[2];
    } else if (mark >= 50 && mark <60) {
        return GRADE_LABELS[3];
    } else if (mark < 50) {
        return GRADE_LABELS[4];
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
 * @returns {{success: boolean, gpa: string, grades: *}}
 */
function getMinimumGradesForGPA(grades,goalGpa,currentGpa,unitsCompleted, unitsAvailable) {
    let gpa = (this.calculateGPA(grades)*unitsAvailable + (currentGpa*unitsCompleted))/(unitsAvailable + unitsCompleted);
    if (gpa >= goalGpa) {
        return {gpa: gpa.toFixed(3), grades: grades, success: true};
    } else if (grades[0] === unitsAvailable) {
        return {gpa: gpa.toFixed(3), grades: grades, success: false};
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
        return getMinimumGradesForGPA(grades,goalGpa,currentGpa,unitsCompleted,unitsAvailable);
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
        let rowTotalCount = 0;
        html += `<tr><th scope="row">${a}</th>`;
        for (let b of headers) {
            let x = data[a].hasOwnProperty(b) ? data[a][b] : 0;
            rowTotalCount += x;
            colTotals[b] = colTotals.hasOwnProperty(b) ? colTotals[b] + x : x;
            html += `<td>${x}</td>`;
        }
        total += rowTotalCount;
        html += rowTotal ? `<td class="${cssTotal}">${rowTotalCount}</td>` : '';
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

function renderTemplate(html, data) {
    Object.keys(data).forEach((key) => {
        let regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, data[key]);
    });
    return html;
}

function getPlanRequirements(year, code, type) {
    return $.get(`/plan.php?c=${code}&y=${year}&t=${type}`)
        .fail((res) => {
            console.log(res);
            return false;
        });
}

function getCourseRequirements(year, code) {
    return $.get(`/req.php?c=${code}&y=${year}`)
        .fail((res) => {
            console.log(res);
            return false;
        });
}

function cleanHeaders(strArr) {
    if (strArr[0] === "    Semester / Session") {
        return _.rest(strArr, 9);
    } else {
        return strArr;
    }
}

function isCourseCode(str) {
    return /^([A-Z]{4}[0-9]{4})$/.test(str);
}

function isSessionYear(str) {
    let arr = str.split(", ");
    return DEFAULT_SESSION_ORDER.includes(arr[0]) && /^(20[0-9]{2})$/.test(arr[1]) && arr.length === 2;
}

function getSessionYear(str) {
    return str.split(", ")
}

function isMark(str) {
    return /^([0-9]{1,2})$|^100$/.test(str);
}

function filterISISInput(strArr) {
    return _.filter(strArr, (str) => {
        return isSessionYear(str) || isMark(str) || isCourseCode(str) && str !== ""
    });
}

function parseISISImport(input) {
    let rtn = {valid: true, results: []};
    let data = filterISISInput(input.split("\n"));
    for (let i = 0; i < data.length; i++) {
        if (isSessionYear(data[i])) {
            let sessionYear = getSessionYear(data[i]);
            let code = data[i+1];
            if (!isCourseCode(code)) {
                rtn.valid = false;
                break;
            }
            let mark = null;
            if (!isSessionYear(data[i+2])) {
                mark = data[i+2];
            }
            rtn.results.push({year: sessionYear[1], session: sessionYear[0], code: code, mark: mark});
        }
    }
    return rtn;
}


/*********************************
    DATA TYPE DECLARATIONS
 *********************************/
function Year(name, dataName) {
    return {
        name: name,
        dataSrc: dataName,
        type: DATA_LEVEL_TYPES.YEAR,
        sessions: [],
        plans: []
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

function Plan(code, type, html) {
    return {
        code: code,
        type: type,
        html: html
    }
}


/*********************************
    CLASSES
 *********************************/
class Model {

    constructor() {
        this.store = {
            years: []
        };
        this.data = {};
    }

    /**
     * Saves the store to the local storage.
     * @private
     */
    _commit() {
        localStorage.setItem('degree_plan', JSON.stringify(this.store));
    }

    /**
     * Evaluates the statement, saves the store to localStorage and then returns the statements return value
     * @param stmt The statement to execute
     * @returns {*} The return from the statement
     * @private
     */
    _evalAndCommit(stmt) {
        let rtn = eval(stmt);
        this._commit();
        return rtn;
    }

    sortStore() {
        this.store.years.forEach(year => {
           year.sessions.sort((s1, s2) => {
               let s1Index = TIME_SESSION_ORDER.indexOf(s1.name);
               let s2Index = TIME_SESSION_ORDER.indexOf(s2.name);
               if (s1Index < s2Index) { return -1; }
               if (s1Index > s2Index) {return 1; }
               return 0;
           });
        });
        this.store.years.sort((y1, y2) => {
            if (y1.name < y2.name) { return -1; }
            if (y1.name > y2.name) { return 1; }
            return 0;
        });
    }

    /**
     * Adds a year to the model store
     * @param year The year to add
     * @param dataSource The year to source data from, default to same as year
     * @returns {number} Returns index of added year, or -1 if year already exists.
     */
    addYear(year, dataSource=this.getYearDataSource(year)) {
        if (this.getYearIndex(year) === RETURN_CODES.NOT_EXISTS.YEAR) {
            return this._evalAndCommit(this.store.years.push(Year(year, dataSource)) -1);
            /*let rtn = this.store.years.push(Year(year, dataSource)) -1;
            this._commit();
            return rtn;*/

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
        year = year.toString();
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
            this._commit();
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
    addSession(year, session, forceAdd=false, yearIndex=this.getYearIndex(year)) {
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
            return this._evalAndCommit(this.store.years[yearIndex].sessions.push(Session(session)) -1);
            /*let rtn = this.store.years[yearIndex].sessions.push(Session(session)) -1;
            this._commit();
            return rtn;*/

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
            this._commit();
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
        if (this.getCourseIndex(year, session, code) >= 0) {
            return RETURN_CODES.EXISTS_ALREADY.COURSE;
        } else {
            return this._evalAndCommit(this.store.years[yearIndex].sessions[sessionIndex].courses.push(Course(code, mark)) - 1);
            /*let rtn = this.store.years[yearIndex].sessions[sessionIndex].courses.push(Course(code, mark)) - 1;
            this._commit();
            return rtn;*/
        }
    }

    /**
     * Returns course index given year and session
     * @param year The year the course is in
     * @param session The session the course is in
     * @param code The course code
     * @param data
     * @returns {number} The index, or a return code.
     */
    getCourseIndex(year, session, code, data=false) {
        let sessionIndex = this.getSessionIndex(year, session);
        if (sessionIndex >= 0) {
            let yearIndex = this.getYearIndex(year);
            let index = _.findIndex(this.store.years[yearIndex].sessions[sessionIndex].courses, (courseIteration) => {
                return courseIteration.code === code;
            });
            if (index === -1) {
                return RETURN_CODES.NOT_EXISTS.COURSE;
            } else {
                return data ? this.store.years[yearIndex].sessions[sessionIndex].courses[index] : index;
            }
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
            this._commit();
            return RETURN_CODES.REMOVED.COURSE;
        } else {
            return courseIndex;
        }
    }

    /**
     * Sets a mark for a course
     * @param year The year the course is in
     * @param session The session the course is in
     * @param code The code of the course
     * @param courseMark The new mark
     * @returns {number|*} Returns the mark, or error.
     */
    setMarkForCourse(year, session, code, courseMark) {
        let yearIndex = this.getYearIndex(year);
        if (yearIndex < 0) {
            return yearIndex;
        }
        let sessionIndex = this.getSessionIndex(year, session, yearIndex);
        if (sessionIndex < 0) {
            return sessionIndex;
        }
        let courseIndex = this.getCourseIndex(year, session, code);
        if (courseIndex < 0) {
            return courseIndex;
        }
        return this._evalAndCommit(this.store.years[yearIndex].sessions[sessionIndex].courses[courseIndex].mark = courseMark);
        /*let rtn = this.store.years[yearIndex].sessions[sessionIndex].courses[courseIndex].mark = courseMark;
        this._commit();
        return rtn;*/
    }

    /**
     * Gets the mark for a given course in the store.
     * @param year The year the course is in
     * @param session The session the course is in
     * @param code The code of the course
     * @returns {*}
     */
    getMarkForCourse(year, session, code) {
        let courseData = this.getCourseIndex(year, session, code, true);
        return courseData < 0 ? courseData : courseData.mark;
    }

    /**
     * Gets the data source to use for a given year.
     * Either uses the data source defined in the store, or the start/end data year.
     * @param year The year that the data source is required for
     * @returns {string} The data source year
     */
    getYearDataSource(year) {
        let yearIndex = this.getYearIndex(year);
        if (yearIndex === RETURN_CODES.NOT_EXISTS.YEAR) {
            if (year > END_YEAR_DATA) {
                return END_YEAR_DATA;
            } else if(year < START_YEAR_DATA) {
                return START_YEAR_DATA;
            } else {
                return year;
            }
        } else {
            return this.store.years[yearIndex].dataSrc;
        }
    }

    /**
     * Returns the course data given a year/code.
     * The form is {sessions: string,
     *              code: string,
     *              level: string,
     *              name: string,
     *              units: string}
     * @param year The year for the data source
     * @param code The course code
     * @returns {course data|RETURN_CODE} The course data or course not found error.
     */
    getCourseData(year, code) {
        let yearIndex = this.getYearIndex(year);
        let dataSource = year;
        if (yearIndex >= 0) {
            dataSource = this.store.years[yearIndex].dataSrc;
        } else {
            dataSource = this.getYearDataSource(year);
        }
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

    /**
     * Returns the possible new years to add.
     * @returns {array} A list of years to add.
     */
    getNewYearOptions() {
        let currentYears = this.getCurrentYears();
        return YEAR_LIST.filter(x => !currentYears.includes(x));
    }

    /**
     * Gets possible options for sessions in a year
     * @param year The year that the session is being added to
     * @returns {string[]} An array of session strings
     */
    getNewSessionOptions(year) {
        let yearIndex = this.getYearIndex(year);
        if (yearIndex === RETURN_CODES.NOT_EXISTS.YEAR) {
            console.log('returning default');
            return DEFAULT_SESSION_ORDER;
        } else {
            let currentSessions = this.store.years[yearIndex].sessions.map(session => {return session.name});
            return DEFAULT_SESSION_ORDER.filter(x => !currentSessions.includes(x));
        }
    }

    /**
     * Returns current years in model
     * @returns {*[]} An array of years
     */
    getCurrentYears() {
        return this.store.years.map(year => {return year.name});
    }

    /**
     * Checks if a course is available in a given session
     * @param year The year name  eg. "2020"
     * @param session The session name eg. "First Semester"
     * @param code The code to check eg "COMP1100"
     * @returns {boolean} Returns true if it is available
     */
    isCourseAvailableInSession(year, session, code) {
        let courseData = this.getCourseData(year,code);
        if (courseData === RETURN_CODES.DATA_NOT_FOUND.COURSE_MODEL) {
            console.error(`${code} does not exist for ${year}`);
            return false;
        } else {
            return courseData.sessions.includes(session);
        }
    }

    /**
     * Checks if a session is empty
     * @param year The year to check eg. "2020"
     * @param session The session to check eg. "First Semester"
     * @returns {*} Boolean or error code if year doesn't exist
     */
    isSessionEmpty(year, session) {
        let sessionIndex = this.getSessionIndex(year, session);
        return sessionIndex < 0 ? sessionIndex : this.store.years[this.getYearIndex(year)].sessions[sessionIndex].courses.length === 0
    }

    /**
     * Checks if a year is empty
     * @param year The year to check eg. "2019"
     * @returns {*} Boolean if year exists, otherwise error code
     */
    isYearEmpty(year) {
        let yearIndex = this.getYearIndex(year);
        return yearIndex < 0 ? yearIndex : this.store.years[yearIndex].sessions.length === 0;
    }

    /**
     * Returns summarised data of the current store.
     * @returns {{codes: {}, sessions: {}}}
     */
    getDataSummary() {
        // returns summary by code and session
        let rtn = {codes: {}, sessions:{}};
        this.store.years.forEach((year, yIndex) => {
            rtn.sessions[year.name] = {};
            year.sessions.forEach((session, sIndex) => {
               session.courses.forEach((course, cIndex) => {
                   let faculty = course.code.substr(0,4);
                   let level = course.code.substr(4,1)+"000";
                   let courseModel = this.getCourseData(year.name, course.code);
                   let units = courseModel !== RETURN_CODES.DATA_NOT_FOUND.COURSE_MODEL ? parseInt(courseModel.units) : 6;

                   if (!rtn.sessions[year.name].hasOwnProperty(session.name)) {
                       rtn.sessions[year.name][session.name] = 0;
                   }
                   console.log(courseModel.units);
                   rtn.sessions[year.name][session.name] += units;

                   if (!rtn.codes.hasOwnProperty(level)) {
                       rtn.codes[level] = {};
                   }
                   if (!rtn.codes[level].hasOwnProperty(faculty)) {
                       rtn.codes[level][faculty] = 0;
                   }
                   rtn.codes[level][faculty] += units;
               });
            });
        });
        return rtn;
    }

    /**
     * Checks if a course is completed by the year/session.
     * Returns true if the course is in the session specified.
     * @param year The year that the course needs to be completed by
     * @param session The session that the course needs to be completed by
     * @param code The course code to check
     * @returns {boolean} True if it has been completed by year/sesison, otherwise false.
     */
    isCourseCompleted(year, session, code) {
        let rtn = false;
        for (let yearSearch of this.store.years) {
            let sessionArr = _.filter(yearSearch.sessions, (sessionIterable) => {
               return (yearSearch.name < year)
                        || ((yearSearch.name === year)
                        && (_.indexOf(TIME_SESSION_ORDER, session) >= _.indexOf(TIME_SESSION_ORDER, sessionIterable.name)))
            });
            for (let sessionSearch of sessionArr) {
                for (let course of sessionSearch.courses) {
                    if (course.code === code) {
                        rtn = true;
                        break;
                    }
                }
            }
        }
        return rtn;
    }

    /**
     * Returns a HTML table to be printed to PDF.
     * @returns {string} HTML code for a table
     */
    getTableForPDF() {
        let rtn = "<table><tr><th scope='col'>Year</th><th scope='col'>Session</th><th scope='col'>Code</th><th scope='col'>Course</th></tr>";
        this.sortStore();
        for (let year of this.store.years) {
            let yrPrinted = false;
            let yrCount = 0;
            for (let session of year.sessions) {
                let ssnPrinted = false;
                let ssnCount = 0;
                for (let course of session.courses) {
                    let courseModel = this.getCourseData(year.name, course.code);
                    rtn += `<tr>`;
                    if (!yrPrinted) {
                        rtn += `<td rowspan='YRCOUNT'>${year.name}</td>`;
                        yrPrinted = true;
                    }
                    if (!ssnPrinted) {
                        rtn += `<td rowspan='SSNCOUNT'>${session.name}</td>`;
                        ssnPrinted = true;
                    }
                    rtn += `<td>${course.code}</td><td>${courseModel.name} (${courseModel.units} units)</td></tr>`;
                    ssnCount++;
                    yrCount++;
                }
                rtn = rtn.replace('SSNCOUNT', ssnCount);
            }
            rtn = rtn.replace("YRCOUNT",yrCount);
        }
        return rtn += "</table>";
    }

    /**
     * Gets CSV serialisation of the store
     */
    getCSVString() {
        let data = this.getDataSummary();
        this.sortStore();
        let rtn = "Year,Session,Code,Name,Units\n";
        this.store.years.forEach(year => {
            year.sessions.forEach(session => {
                session.courses.forEach(course => {
                    let data = this.getCourseData(year.name, course.code);
                    rtn += `${year.name},${session.name},${course.code},${data.name.replace(",", "")},${data.units}\n`;

                });
            });
        });
        return rtn;
    }

    /**
     * TODO: can get rid of this
     * Downloads CSV data.
     * @param data The data to download
     * @param filename The filenmae, defaults to anudegree_TIMESTAMP
     */
    downloadCSV(data, filename=`anudegree_${new Date().getTime()}`) {
        downloadFile(data,`${filename}.csv`, "data:text/csv;encoding-8");
    }

    /**
     * Returns list of plans to be used for the Selectize search, categorised by type.
     * The group value indicates if it has been searched before (curr = new, prev = history).
     * @param year The year to search for
     * @returns {[]} An array of plan objects
     */
    getSearchItemsForPlans(year) {
        // returns combined list of majors, minors and programs
        let cached = this.getCachedPlans();
        let rtn = [];
        let yearSrc = this.getYearDataSource(year);
        this.data.majors[yearSrc].forEach((plan) => {
           let group = cached.includes(plan.c) ? "prev" : "curr";
           rtn.push({...plan, type: 'Major', group: group});
        });
        this.data.minors[yearSrc].forEach((plan) => {
            let group = cached.includes(plan.c) ? "prev" : "curr";
            rtn.push({...plan, type: 'Minor', group: group});
        });
        this.data.programs[yearSrc].forEach((plan) => {
            let group = cached.includes(plan.c) ? "prev" : "curr";
            rtn.push({...plan, type: 'Program', group: group});
        });
        return rtn;
    }

    /**
     * Returns a filtered list of courses given conditions
     * @param year The year to search for
     * @param sessions An array of sessions to search with eg. ['First Semester', 'Second Semester']
     * @param codes An array of code prefixes eg. ['COMP', 'MATH']
     * @param careers An array of levels to filter by eg. ['Postgraduate']
     * @returns {*} A list of course objects for Selectize
     */
    getSearchItemsForCourses(year, sessions, codes, careers) {
        return this.data.courses[this.getYearDataSource(year)].filter((c) => {
            return   (sessions.some((s) => c.s.includes(s)) || sessions.length === 0)
                &&      (codes.includes(c.c.substr(0,4)) || codes.length === 0)
                &&      (careers.includes(c.l) || careers.length === 0);
        });
    }

    /**
     * Caches a plan into the store.
     * @param year The year of the plan
     * @param code The plan code
     * @param planType Major/Minor/Program
     * @param html The html of the plan requirements
     * @param force If to force add (true by default).
     * @returns {number} The index of the plan
     */
    setPlanCache(year, code, planType, html, force=true) {
        let yearIndex = this.getYearIndex(year);
        if (yearIndex === RETURN_CODES.NOT_EXISTS.YEAR) {
            if (force) {
                yearIndex = this.addYear(year);
            } else {
                return yearIndex;
            }
        }
        let planIndex = this.getPlanIndex(year, code);
        if (planIndex >=0) {
            this.store.years[yearIndex].plans[planIndex].html = html;
            this._commit();
            return planIndex;
        } else {
            this._evalAndCommit(this.store.years[yearIndex].plans.push(Plan(code, planType, html)) - 1);
            /*let rtn = this.store.years[yearIndex].plans.push(Plan(code, planType, html)) - 1;
            this._commit();
            return rtn;*/
        }
    }

    /**
     * Resets the plan cache
     */
    resetPlanCache() {
        this.store.years.forEach((year) => {
           year.plans = [];
        });
        this._commit();
    }

    /**
     * Gets the the index of a plan
     * @param year The year it is in
     * @param code The code for the plan
     * @param yearIndex The year index if available
     * @returns {number} The index of the plan, or an error code.
     */
    getPlanIndex(year, code, yearIndex=this.getYearIndex(year)) {
        if (yearIndex === RETURN_CODES.NOT_EXISTS.YEAR) {
            return yearIndex;
        } else {
            let index = this.store.years[yearIndex].plans.findIndex((plan) => plan.code === code);
            if (index === -1) {
                return RETURN_CODES.NOT_EXISTS.PLAN;
            } else {
                return index;
            }
        }
    }

    /**
     * Returns the plan object which includes html
     * @param year The year the plan is in
     * @param code The code of the plan eg. "REEN-MAJ"
     * @returns {number|*} The plan object, or an error code.
     */
    getCachedPlan(year, code) {
        let yearIndex = this.getYearIndex(year);
        if (yearIndex < 0) {
            return yearIndex;
        } else {
            let planIndex = this.getPlanIndex(year, code, yearIndex);
            if (planIndex >= 0) {
                return this.store.years[yearIndex].plans[planIndex];
            } else {
                return RETURN_CODES.NOT_EXISTS.PLAN;
            }
        }
    }

    /**
     * Gets a list of cached plans
     * @returns {[]} An array of plan codes eg. ['REEN-MAJ', 'CSCI-MAJ']
     */
    getCachedPlans() {
        let rtn = [];
        this.store.years.forEach((year) => {
           year.plans.forEach((plan) => {
               if (_.indexOf(rtn, plan.code) === -1) {
                   rtn.push(plan.code);
               }
           });
        });
        return rtn;
    }

}

class View {
    constructor() {
        this.settings = {
            courseSelectize: {
                searchField: ["c","n"],
                maxItems: 1,
                sortField: 'c',
                valueField: 'c',
                labelField: 'n',
                render: {
                    item: (c, escape) => {
                        return `<div><strong>${escape(c.c)}</strong> ${escape(c.n)}</div>`;
                    },
                    option: (c, escape) => {
                        return `<div class="ml-2 my-1">
                            <strong>${escape(c.c)}</strong>  ${escape(c.n)}
                            <br/>
                            <small><strong>Units: </strong> ${escape(c.u)}</small>
                            <small><strong>Sessions: </strong> ${escape(c.s)}</small>
                        </div>`;
                    }
                }
            },
            planSelectize: {
                searchField: ["n","c"],
                maxItems: 1,
                sortField: 'c',
                valueField: 'c',
                labelField: 'n',
                optgroups: [
                    {value: 'prev', label: 'History'},
                    {value: 'curr', label: 'Results'},
                ],
                lockOptgroupOrder: true,
                optgroupField: 'group',
                render: {
                    item: (c, escape) => {
                        return `<div><strong>${escape(c.c)}</strong> ${escape(c.n)}</div>`;
                    },
                    option: (c, escape) => {
                        return `<div class="ml-2 my-1">
                                <strong>${escape(c.c)}</strong>  ${escape(c.n)}
                                <br/>
                                <small><strong>Level: </strong> ${escape(c.l)}</small>
                            </div>`;
                    },
                    optgroup_header: (d, escape) => {
                        return `<div></div>`;
                        //return `<div class='optgroup-header'>${escape(d.label)}</div>'`;
                    }
                }
            },
            csvTable: undefined,
            htmlTable: undefined
        };
        this.page = {
            // all jQuery selectors here
            tmpl: {
                year: {
                    get: (data) => {
                        return renderTemplate($('#year-tab-content-template').html(), data)
                    },
                    sel: (year) => {
                        return $(`a[data-year=${year}][data-role=year-tab-nav]`);
                    }
                },
                yearTab: {
                    get: (data) => {
                        return renderTemplate($('#year-tab-nav-template').html(), data)
                    },
                    sel: (year) => {
                        return $(`div[data-year=${year}][data-role=year-container]`);
                    }
                },
                session: {
                    get: (data) => {
                        return renderTemplate($('#session-template').html(), data);
                    },
                    sel: (year, session) => {
                        return $(`div[data-role=session][data-year=${year}][data-session='${session}']`);
                    }
                },
                course: {
                    get: (data) => {
                        return renderTemplate($('#course-template').html(), data);
                    },
                    sel: (year, session, course) => {
                        return $(`tr[data-role=course-row][data-year=${year}][data-session='${session}'][data-course=${course}]`);
                    }
                },
                wamRow: {
                    get: (data) => {
                        return renderTemplate($('#wamRowTemplate').html(), data);
                    }
                },
                wamManualRow: {
                    get: () => {
                        return renderTemplate($('#wamRowManualTemplate').html(), {});
                    }
                },
            },
            modals: {
                course: {
                    id: $('#courseSelectModal'),
                    dataWarning: $('#courseSelectWarning'),
                    search: {
                        sessions: $('#courseSelectSessionSelect').selectize(),
                        codes: $('#courseSelectCodeSelect').selectize({
                            sortField: 'text'
                        }),
                        career: $('#courseSelectCareerSelect').selectize(),
                        course: $('#courseSelectCourseSearch').selectize(this.settings.courseSelectize),
                        requirements: $('#courseSelectReqText'),
                        spinner: $('#courseSelectReqSpinner')
                    },
                    plan: {
                        year: $('#courseModalPlanYearSelect'),
                        textContainer: $('#courseModalPlanTextContainer'),
                        requirementsText: $('#courseModalPlanText'),
                        spinner: $('#courseModalPlanSpinner'),
                        code: $('#courseCodeHolder'),
                        courseRequirements: {
                            textContainer: $('#courseModalPlanReqTextContainer'),
                            text: $('#courseModalPlanReqText'),
                            spinner: $('#courseModalPlanReqSpinner'),
                            code: $('#courseModalPlanReqTextCode'),
                        },
                        search: $('#courseModalPlanSearch').selectize(this.settings.planSelectize),
                    },
                    planActive: () => {return $('#courseModalNavPlanPill').hasClass("active")}
                },
                year: {
                    id: $('#yearSelectModal'),
                    select: $('#yearSelectModal select'),
                },
                session: {
                    id: $('#sessionSelectModal'),
                    select: $('#sessionSelectModal select'),
                },
                requirements: {
                    id: $('#requirementsModal'),
                    year: $('#requirementsModalYearSelect'),
                    text: $('#requirementsModalText'),
                    textContainer: $('#requirementsModalTextContainer'),
                    spinner: $('#requirementsModalSpinner'),
                    search: $('#requirementsModalSearch').selectize(this.settings.planSelectize),
                },
                import: {
                    id: $('#importModal'),
                    input: $('#importInput'),
                    table: $('#importTable'),
                    submit: $('#importSubmit'),
                    overwrite: () => {return $('#importOptionOverwrite').is(':checked')},
                    currentData: [],
                },
                gpa: {
                    id: $('#gpaModal'),
                    wam: {
                        table: $('#wamModalAutoTable'),
                        manTable: $('#wamModalManualTable'),
                        resultGPA: $('#wamModalGPA'),
                        resultWAM: $('#wamModalWAM'),
                        lastElement: $('#wamModalAutoTable table > tbody:last-child'),
                        inputClass: '.wam-mark-input',
                        mode: $('#wamModalEntryMode'),
                        manAdd: $('#wamModalManualAddCourse'),
                        manAddMarker: $('#wamModalTableMarker'),
                        isManual: () => {return $('#wamModalEntryMode').is(':checked')},
                        isFirst: () => {return $('#wamModalExcl1000').is(':checked')},
                    },
                    gpa: {
                        inputControl: $('.input-num-control'),
                        input: $('.gpa-unit-entry'),
                        gradeInput: $(".input-num-control[data-type='gpa-course']"),
                        totalUnits: $('#gpaModalTotalUnits'),
                        totalCourses: $('#gpaModalTotalCourses'),
                        resultGPA: $('#gpaModalManualGrade'),
                        goal: {
                            gpa: $('#gpaModalGoalGPA'),
                            semesters: $('#gpaModalGoalSemesters'),
                            submit: $('#gpaModalGoalSubmit'),
                            results: $('#gpaModalGoalResults'),
                            resultGPA: $('#gpaModalGoalResultGpa'),
                        }
                    }
                },
                summary: {
                    id: $('#unitSummaryModal'),
                    codes: $('#unitSummaryCodes'),
                    sessions: $('#unitSummarySessions')
                }
            },
            nav: {
                import: $('#importBtn'),
                unitSummary: $('#unitSummaryBtn'),
                plan: $('#reqBtn'),
                gpa: $('#gpaBtn'),
                savePdf: $('#savePdfBtn'),
                saveCSV: $('#saveCsvBtn'),
                addYear: $('#add-year'),
                reset: $('#resetDataBtn'),
            },
            tabNav: $('#navTabs'),
            tabContent: $('#tabContents'),
        }
    }

    addYear(year) {
        let data = {year: year};
        this.page.tabNav.find('li:last').before(this.page.tmpl.yearTab.get(data));
        this.page.tabContent.append(this.page.tmpl.year.get(data));
    }

    removeYear(year) {
        this.page.tmpl.yearTab.sel(year).fadeOutAndRemove('fast');
        this.page.tmpl.year.sel(year).parent().fadeOutAndRemove('fast');
    }

    showTab(year) {
        this.page.tmpl.year.sel(year).tab('show');
    }

    addSession(year, session) {
        let data = {year: year, session: session};
        this.page.tmpl.yearTab.sel(year).find('div[data-role=session-container]').append(this.page.tmpl.session.get(data));
    }

    removeSession(year, session) {
        this.page.tmpl.session.sel(year, session).fadeOutAndRemove('fast');
    }

    addCourse(year, session, code) {
        let dataSource = app.model.getYearDataSource(year);
        let courseData = app.model.getCourseData(dataSource, code);
        let data = {
            year: year,
            session: session,
            code: code,
            units: courseData.units,
            name: courseData.name,
            dataYear: dataSource
        };
        let html = this.page.tmpl.course.get(data);
        this.page.tmpl.session.sel(year, session).find('tbody:last').before(html);
    }

    removeCourse(year, session, course) {
        this.page.tmpl.course.sel(year, session, course).fadeOutAndRemove('fast');
    }

    showModal(modal, beforeShow, yesCallback, noCallback, event, context={}) {
        beforeShow(event, context);
        modal.modal();
        let yesBtn = modal.find('button[data-action=modal-yes]');
        let noBtn = modal.find('button[data-action=modal-no]');
        yesBtn.one('click', (e) => {
            noBtn.off('click');
            yesCallback(e, context);
        });
        noBtn.one('click', (e) => {
           yesBtn.off('click');
           noCallback(e, context);
        });
    }

    checkRequirements(selector, year, session, addCourseButtons = false) {
        selector.find("a[data-coursecode]").each((i, e) => {
            let sel = $(e);
            sel.next("button[data-action='add-course-plan']").remove();
            let code = sel.data('coursecode');
            let completed = app.model.isCourseCompleted(year, session, code);
            sel.removeClass();
            if (addCourseButtons) {
                if (completed) {
                    sel.addClass("text-success");
                } else {
                    let courseData = app.model.getCourseData(year, code);
                    if (courseData === RETURN_CODES.DATA_NOT_FOUND.COURSE_MODEL) {
                        sel.addClass(["text-secondary", "text-strikethrough"]);
                    } else {
                        if (courseData.sessions.includes(session)) {
                            sel.addClass("text-primary");
                            $(e).after(`<button class='btn btn-outline-primary btn-sm ml-2' data-action='add-course-plan'>Select</button>`);
                        } else {
                            sel.addClass("text-secondary");
                        }
                    }
                }
            } else {
                if (completed) {
                    sel.addClass("text-success");
                } else {
                    sel.addClass("text-danger");
                }
            }
        });
    }

    getUnitSummaryHTML(data) {
        return {
          codes: generateHtmlTable(data.codes, "Level", true, true, (a,b) => {
              let aCnt = 0;
              let bCnt = 0;
              for (let level of Object.keys(data.codes)) {
                  if (data.codes[level].hasOwnProperty(a)) {
                      aCnt += data.codes[level][a];
                  }
                  if (data.codes[level].hasOwnProperty(b)) {
                      bCnt += data.codes[level][b];
                  }
              }
              return bCnt - aCnt;
          }),
          sessions: generateHtmlTable(data.sessions, "Year", true, true, (a,b) => {
              return DEFAULT_SESSION_ORDER.indexOf(a) - DEFAULT_SESSION_ORDER.indexOf(b);
          })
        };

    }

    updateGPAFields(selector, value) {
        let unitsLabelText = value === 0 ? "" : `${value*6} units`;

        let totalCourses = this.getGPACourseTotal();
        let totalCoursesText = totalCourses;
        let totalUnitsText = totalCourses === 0 ? "" : `${totalCourses*6} units`;

        selector.closest(".form-group").find(".units-label").text(unitsLabelText);
        this.page.modals.gpa.gpa.totalCourses.text(totalCoursesText);
        this.page.modals.gpa.gpa.totalUnits.text(totalUnitsText);
    }

    getGPAGradeCounts() {
        return $('.gpa-unit-entry').map((i, e) => {
            return parseInt($(e).val());
        }).get();
    }

    getGPACourseTotal() {
        return this.getGPAGradeCounts().reduce((accm, n) => {
            return accm + n;
        });
    }

    renderWAMTable() {
        this.page.modals.gpa.wam.table.find("table tbody").html("");
        let i = 0;
        app.model.store.years.forEach(year => {
           year.sessions.forEach(session => {
              session.courses.forEach(course => {
                 let courseData = app.model.getCourseData(year.name, course.code);
                 let data = {
                     year: year.name,
                     session: session.name,
                     code: course.code,
                     units: courseData.units,
                     name: courseData.name,
                     mark: course.mark === null ? "" : course.mark,
                     grade: course.mark === null ? "" : getGradeFromMark(course.mark)
                 };
                 this.page.modals.gpa.wam.lastElement.append(this.page.tmpl.wamRow.get(data));
                 i++;
              });
           });
        });
        if (i === 0) {
            this.page.modals.gpa.wam.lastElement.append("<tr><td colspan='4'>Add courses to your planner to calculate WAM</td></tr>");
        }
    }

    renderWAMTableResults(manual, firstYear) {
        let marks = [];
        let grades = [0, 0, 0, 0, 0];
        if (manual) {
            $('#wamModalManualTable .wam-mark-input').each((i, input) => {
                let sel = $(input);
                let value = sel.val();
                let row = sel.closest("tr");
                let level = row.find('.wam-table-input-level').val();
                let units = row.find('.wam-table-input-unit').val();
                if (value !== "") {
                    if (firstYear && level === "1000") {
                        return true;
                    } else {
                        for (let i = 0; i < units/6; i++) {
                            marks.push(value);
                        }
                        grades[GRADE_LABELS.indexOf(getGradeFromMark(value))] += units/6;
                    }
                }
            });
        } else {
            $('#wamModalAutoTable .wam-mark-input').each((i, input) => {
                let sel = $(input);
                let value = sel.val();
                let row = sel.closest("tr");
                let units = row.data('units');
                let level = row.data('course').charAt(4);
                if (value !== "") {
                    if (firstYear && level === "1") {
                        return true;
                    } else {
                        for (let i = 0; i < units/6; i++) {
                            marks.push(value);
                        }
                        grades[GRADE_LABELS.indexOf(getGradeFromMark(value))] += units/6;
                    }
                }
            });
        }
        this.page.modals.gpa.wam.resultGPA.text(calculateGPA(grades));
        this.page.modals.gpa.wam.resultWAM.text(calculateWam(marks));
    }

    addRowToWAMManualTable() {
        this.page.modals.gpa.wam.manAddMarker.before(this.page.tmpl.wamManualRow.get());
    }

    loadViewFromSave(data) {
        data.years.forEach((year) => {
            this.addYear(year.name);
            year.sessions.forEach((session) => {
                this.addSession(year.name, session.name);
                session.courses.forEach((course) => {
                   app.view.addCourse(year.name, session.name, course.code);
                });
            });
        });
        this.showTab(data.years[0].name);
    }

    showLocalStorageError(errorMessage) {
        $('#localStorageErrorCode').text(errorMessage);
        $('#localStorageAlert').removeClass("d-none");
        $('.localStorageErrorHide').addClass("d-none");
        $('#getStartedAlert').alert('close');
        $('#mobileAlert').alert('close');
    }

    getCodeListForYear(year) {
        let dataSource = app.model.getYearDataSource(year);
        let codeList = app.model.data.courses[dataSource].map((course) => {
            return course.c.substr(0,4);
        });
        return [...new Set(codeList)].map((code) => {
           return {value: code, text: code};
        });
    }

    renderImportResultsTable(data) {
        data.forEach(course => {
            $('#importTable > tbody').append(`<tr><td>${course.year}</td><td>${course.session}</td>` +
                                            `<td>${course.code}</td><td>${course.mark === null ? "" : course.mark}</td></tr>`);
        });
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
        if (savedStore !== null && savedStore.years.length !== 0) {
            this.model.store = savedStore;
            console.log(`Store has been loaded from localStorage`);
            this.model.sortStore();
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
        let v = this.view.page;

        v.nav.gpa.click(() => {
            app.view.renderWAMTable();
            app.view.renderWAMTableResults(v.modals.gpa.wam.isManual(), v.modals.gpa.wam.isFirst());
            v.modals.gpa.id.modal();
        });

        $(document).on('input', v.modals.gpa.wam.inputClass, (e)=> {
            let m = v.modals.gpa.wam;
            let sel = $(e.target);
            let value = sel.val();
            if (value.length > 3) {
                sel.val(value.slice(0,3));
            }
            if (value > 100) {
                sel.val(100);
            }
            if (value < 0) {
                sel.val(0);
            }

            if (value === "") {
                sel.parent().next().text("");
            } else {
                sel.parent().next().text(getGradeFromMark(value));
            }
            
            if (!m.isManual()) {
                let row = sel.closest("tr");
                //console.log(`${row.data("year")} ${row.data("session")} ${row.data("course")} ${value}`);
                app.model.setMarkForCourse(row.data("year"), row.data("session"), row.data("course"), value);
            }

            app.view.renderWAMTableResults(m.isManual(), m.isFirst());
        });

        v.modals.gpa.gpa.inputControl.on('click', (e)=>{
            let selector = $(e.target).data("for");
            let action = $(e.target).data("action");
            if (action === "inc") {
                document.getElementById(selector).stepUp();
            } else {
                document.getElementById(selector).stepDown();
            }
        });

        v.modals.gpa.gpa.gradeInput.on('click', (e)=>{
            let sel = $(e.target).parent().siblings('input');
            let val = sel.val();
            sel.removeClass("is-invalid");
            app.view.updateGPAFields(sel, val);
            let gpa = calculateGPA(app.view.getGPAGradeCounts());
            v.modals.gpa.gpa.resultGPA.text(gpa);
            v.modals.gpa.gpa.goal.gpa.val(gpa);
        });

        v.modals.gpa.gpa.goal.submit.click(() => {
            let g = v.modals.gpa.gpa.goal;
            let currentGPA = calculateGPA(app.view.getGPAGradeCounts());
            let currentCourses = app.view.getGPACourseTotal();
            let goalGPA = g.gpa.val();
            let coursesAvailable = g.semesters.val()*4;
            let initGrades = [0, 0, 0, 0, coursesAvailable];
            let result = getMinimumGradesForGPA(initGrades, goalGPA, currentGPA, currentCourses, coursesAvailable);
            if (result.success) {
                g.resultGPA.addClass("text-success").removeClass("text-danger").text(result.gpa);
            } else {
                g.resultGPA.removeClass("text-success").addClass("text-danger").text(result.gpa);
            }
            g.results.removeClass("d-none");
            $('#gpaModalGoalResultText1').text("");
            $('#gpaModalGoalResultText2').text("");
            let n = 1;
            for (let i = 0; i<result.grades.length; i++) {
                let val  = result.grades[i];
                if (val !== 0) {
                    $('#gpaModalGoalResultText' + n).text(`${val} x ${GRADE_LABELS[i]}`);
                    n++;
                }
            }
        });

        v.modals.gpa.wam.mode.on('change', (e)=> {
            let w = v.modals.gpa.wam;
            let manual = w.isManual();
            if (manual) {
                w.table.addClass("d-none");
                w.manTable.removeClass("d-none");
            } else {
                w.table.removeClass("d-none");
                w.manTable.addClass("d-none");
            }
            app.view.renderWAMTableResults(w.isManual(), w.isFirst());
        });

        $('#wamModalExcl1000, .wam-table-input-unit, .wam-table-input-level').on('change', ()=> {
            app.view.renderWAMTableResults(v.modals.gpa.wam.isManual(), v.modals.gpa.wam.isFirst());
        });

        v.modals.gpa.wam.manAdd.on('click', () => {
            app.view.addRowToWAMManualTable();
        });

        v.modals.gpa.gpa.input.on('change input', (e) => {
            console.log("triggered");
            let sel = $(e.target);
            let val = sel.val();
            if (val % 1 !== 0) {
               sel.addClass("is-invalid");
            } else {
               sel.removeClass("is-invalid");
               app.view.updateGPAFields(sel, val);
               let gpa = calculateGPA(app.view.getGPAGradeCounts());
               v.modals.gpa.gpa.resultGPA.text(gpa);
               v.modals.gpa.gpa.goal.gpa.val(gpa);
            }
        });

        v.nav.import.click(() => {
            v.modals.import.id.modal();
        });

        v.modals.import.input.on('input change', () => {
            let i = v.modals.import;
            let data = parseISISImport(i.input.val());
            if (data.valid && data.results.length !== 0) {
                i.input.removeClass("is-invalid");
                i.submit.attr("disabled", false);
                app.view.renderImportResultsTable(data.results);
                i.currentData = data.results;
            } else {
                i.input.addClass("is-invalid");
                i.submit.attr("disabled", true);
                i.currentData = [];
            }
        });

        v.modals.import.submit.click(() => {
            let i = v.modals.import;
            i.currentData.forEach(course => {
                app.model.addCourse(course.year, course.session, course.code, true, course.mark);
            });
            app.view.loadViewFromSave(app.model.store);
        });
        
        v.nav.plan.click(() => {
            let r = v.modals.requirements;
            let currentYears = app.model.getCurrentYears();
            let years = currentYears.length === 0 ?
                YEAR_LIST.filter((year) => {return year <= END_YEAR_DATA}) :
                currentYears.filter((year) => {return year <= END_YEAR_DATA});
            let selected = r.year.val() === "" ? years[0] : r.year.val();
            setInputOptions(r.year, years, selected);
            app.view.checkRequirements(
                r.text,
                "9999",
                "Summer Session",
                false
            );
            r.id.modal();
        });

        v.modals.requirements.search[0].selectize.on('item_add', async () => {
            let r = v.modals.requirements;
            let year = app.model.getYearDataSource(r.year.val());
            let code = r.search[0].selectize.items[0];
            let type = "";
            if ((code.slice(code.length-3)) === "MAJ") {
                type = "Major";
            } else if ((code.slice(code.length-3) === "MIN")) {
                type = "Minor";
            } else {
                type = "Program";
            }
            r.textContainer.addClass("d-none");
            r.spinner.removeClass("d-none");
            let response = "";
            let planIndex = app.model.getPlanIndex(year, code);
            if (planIndex >= 0) {
                response = app.model.getCachedPlan(year, code).html;
            } else {
                response = await getPlanRequirements(year, code, type);
                app.model.setPlanCache(year, code, type, response, true);
            }
            r.textContainer.removeClass("d-none");
            r.spinner.addClass("d-none");
            r.text.html(response);
            app.view.checkRequirements(r.text, "9999", "Summer Session" , false);
        });
        v.modals.requirements.search[0].selectize.on('dropdown_open', () => {
            v.modals.requirements.search[0].selectize.clear(true);
            v.modals.requirements.search[0].selectize.clearOptions();
            v.modals.requirements.search[0].selectize.addOption(app.model.getSearchItemsForPlans(v.modals.requirements.year.val()));
        });
        
        v.nav.saveCSV.click(() => {
            downloadFile(app.model.getCSVString(),`anudegree_${new Date().getTime()}.csv`, "data:text/csv;encoding-8");
        });
        
        v.nav.savePdf.click(() => {
            let doc = new jsPDF();
            $('#pdfTable').html(app.model.getTableForPDF());
            let marginX = 14;
            doc.setFontSize(22);
            doc.text("ANU Degree Plan",marginX,22);
            doc.autoTable({
                html: '#pdfTable table',
                startY: 28,
                styles: {cellWidth: 'wrap'},
                theme: 'grid',
                //columnStyles: {course: {cellWidth: 'auto'}}
            });

            doc.save(`anudegree_${new Date().getTime()}.pdf`);
        });
        
        v.nav.reset.click(() => {
            if (confirm("Are you sure you want to reset your data?")) {
                let years = app.model.getCurrentYears();
                years.forEach((year) => {
                   console.log(app.view.removeYear(year));
                   console.log(app.model.removeYear(year));
                });
            }
        });
        
        v.nav.unitSummary.click(() => {
            let tables = app.view.getUnitSummaryHTML(app.model.getDataSummary());
            v.modals.summary.codes.html(tables.codes);
            v.modals.summary.sessions.html(tables.sessions);
            v.modals.summary.id.modal();
        });

        v.nav.addYear.click((event) => {
            let beforeCallback = (e) => {
                let currentYears = app.model.getCurrentYears();
                setInputOptions(
                    v.modals.year.select,
                    app.model.getNewYearOptions(),
                    currentYears.indexOf(CURRENT_YEAR) === -1 ? CURRENT_YEAR : (parseInt(currentYears.pop())+1).toString(),
                    false);
            };

            let yesCallback = (e) => {
                let newYear = v.modals.year.select.val();
                if (newYear != null) {
                    if (app.model.getYearIndex(newYear) < 0) {
                        app.model.addYear(newYear);
                        app.view.addYear(newYear);
                    }
                    app.view.showTab(newYear);
                }
            };
            this.view.showModal(v.modals.year.id, beforeCallback, yesCallback, ()=>{}, event);
        });

        $(document).on('click', '[data-action=remove-year]', (event) => {
            let year = $(event.target).closest('div[data-role=year-container]').attr('data-year');
            if (!app.model.isYearEmpty(year)) {
                if (!confirm(`Warning: ${year} has session/s in it.\nAre you sure you want to delete it?`)) {
                    return
                }
            }
            app.model.removeYear(year);
            app.view.removeYear(year);
        });

        $(document).on('click', '[data-action=add-session]', (event) => {
            let data = {
                year: $(event.target).closest('div[data-role=year-container]').attr('data-year'),
            };
            let beforeCallback = (e, context) => {
                setInputOptions(v.modals.session.select, app.model.getNewSessionOptions(context.year), null, false);
            };

            let yesCallback = (e, context) => {
                let newSession = v.modals.session.select.val();
                if (newSession != null) {
                    if (app.model.getSessionIndex(context.year, newSession) < 0) {
                        app.model.addSession(context.year, newSession);
                        app.view.addSession(context.year, newSession);
                    }
                }
            };

            this.view.showModal(v.modals.session.id, beforeCallback, yesCallback, ()=>{}, event, data);
        });

        $(document).on('click', '[data-action=remove-session]', (event) => {
            let year = $(event.target).closest('div[data-role=year-container]').attr('data-year');
            let session = $(event.target).closest('div[data-role=session]').attr('data-session');
            if (!app.model.isSessionEmpty(year, session)) {
                if (!confirm(`Warning: ${session} in ${year} has courses selected.\nAre you sure you want to delete it?`)) {
                    return
                }
            }
            app.model.removeSession(year, session);
            app.view.removeSession(year, session);
        });

        $(document).on('click', '[data-action=add-course]', (event) => {
            let data = {
                session: $(event.target).closest('div[data-role=session]').attr('data-session'),
                year: $(event.target).closest('div[data-role=year-container]').attr('data-year'),
            };
            app.currentYear = data.year;
            app.currentSession = data.session;
            data.dataSource = app.model.getYearDataSource(data.year);
            let beforeCallback = (e, context) => {
                let m = v.modals.course;

                m.search.requirements.find('span').html(""); // clear requirements text
                m.search.sessions[0].selectize.clear(true); // clear sessions
                m.search.sessions[0].selectize.addItem(context.session); // add current session
                m.search.codes[0].selectize.clearOptions();
                m.search.codes[0].selectize.addOption(app.view.getCodeListForYear(context.year));
                context.year > END_YEAR_DATA ? m.dataWarning.removeClass('d-none') : m.dataWarning.addClass('d-none');

                let currentYears = app.model.getCurrentYears();
                let years = currentYears.length === 0 ?
                    YEAR_LIST.filter((year) => {return year <= END_YEAR_DATA}) :
                    currentYears.filter((year) => {return year <= END_YEAR_DATA});
                let selected = m.plan.year.val() === "" ? years[0] : m.plan.year.val();
                setInputOptions(m.plan.year, years, selected);
                m.plan.search[0].selectize.clearOptions();
                m.plan.search[0].selectize.addOption(app.model.getSearchItemsForPlans(m.plan.year.val()));
                app.view.checkRequirements(
                    m.plan.requirementsText,
                    this.currentYear,
                    this.currentSession,
                    true
                );
            };

            let yesCallback = (e, context) => {
                let m = v.modals.course;
                let newCourse = m.planActive() ? m.plan.code.html() : m.search.course[0].selectize.items[0];
                console.log(newCourse);
                if (newCourse != null) {
                    app.model.addCourse(context.year, context.session, newCourse);
                    app.view.addCourse(context.year, context.session, newCourse);
                    m.search.course[0].selectize.clear(true);
                }
            };

            this.view.showModal(v.modals.course.id, beforeCallback, yesCallback, ()=>{}, event, data);
        });

        let filterCourses = () => {
            let m = v.modals.course;
            m.search.course[0].selectize.clearOptions();
            m.search.course[0].selectize.clear(true);
            m.search.course[0].selectize.addOption(app.model.getSearchItemsForCourses(
                app.currentYear,
                m.search.sessions[0].selectize.items,
                m.search.codes[0].selectize.items,
                m.search.career[0].selectize.items,
            ));
        };
        v.modals.course.search.sessions.on('change', filterCourses);
        v.modals.course.search.codes.on('change', filterCourses);
        v.modals.course.search.career.on('change', filterCourses);

        let displayCourseRequirements = async () => {
          let m = v.modals.course.search;
          m.requirements.find("span").html("");
          m.requirements.addClass("d-none");
          m.spinner.removeClass("d-none");
          let dataSource = app.model.getYearDataSource(this.currentYear);
          let course = v.modals.course.search.course[0].selectize.items[0];
          let response = await getCourseRequirements(dataSource, course);
          m.requirements.find("span").html(response);
          app.view.checkRequirements(m.requirements.find('span'), this.currentYear, this.currentSession, false);
          m.spinner.addClass("d-none");
          m.requirements.removeClass("d-none");
        };
        v.modals.course.search.course[0].selectize.on('item_add', displayCourseRequirements);

        let newPlanCourse = async () => {
            let m = v.modals.course.plan;
            let year = app.model.getYearDataSource(m.year.val());
            let code = m.search[0].selectize.items[0];
            let type = "";
            if ((code.slice(code.length-3)) === "MAJ") {
                type = "Major";
            } else if ((code.slice(code.length-3) === "MIN")) {
                type = "Minor";
            } else {
                type = "Program";
            }
            m.textContainer.addClass("d-none");
            m.spinner.removeClass("d-none");
            let response = "";
            let planIndex = app.model.getPlanIndex(year, code);
            if (planIndex >= 0) {
                response = app.model.getCachedPlan(year, code).html;
            } else {
                response = await getPlanRequirements(year, code, type);
                app.model.setPlanCache(year, code, type, response, true);
            }
            m.textContainer.removeClass("d-none");
            m.spinner.addClass("d-none");
            m.requirementsText.html(response);
            app.view.checkRequirements(m.requirementsText, this.currentYear, this.currentSession, true);
        };

        v.modals.course.plan.search[0].selectize.on('item_add', newPlanCourse);
        v.modals.course.plan.search[0].selectize.on('dropdown_open', (e) => {
            v.modals.course.plan.courseRequirements.textContainer.addClass("d-none");
            v.modals.course.plan.search[0].selectize.clear(true);
            v.modals.course.plan.search[0].selectize.clearOptions();
            v.modals.course.plan.search[0].selectize.addOption(app.model.getSearchItemsForPlans(v.modals.course.plan.year.val()));
        });

        $(document).on('click', 'button[data-action=add-course-plan]', async (e) => {
            let r = v.modals.course.plan;
            let code = $(e.target).siblings('a[data-coursecode]').attr('data-coursecode');
            let year = app.model.getYearDataSource(this.currentYear);
            r.courseRequirements.text.html("");
            r.courseRequirements.textContainer.addClass("d-none");
            r.courseRequirements.spinner.removeClass("d-none");
            r.courseRequirements.code.text(code);
            r.code.html(code);
            let response = "";
            try {
                response = await getCourseRequirements(year, code);
            } catch (e) {
                response = e;
            }
            r.courseRequirements.text.html(response);
            app.view.checkRequirements(r.courseRequirements.text, this.currentYear, this.currentSession, false);
            r.courseRequirements.spinner.addClass("d-none");
            r.courseRequirements.textContainer.removeClass("d-none");
        });

        $(document).on('click', '[data-action=remove-course]', (e) => {
            let row = $(e.target).closest("tr[data-role=course-row]");
            app.view.removeCourse(row.data('year'), row.data('session'), row.data('course'));
            console.log(row.data('year') + row.data('session') + row.data('course'));
            console.log(app.model.removeCourse(row.data('year'), row.data('session'), row.data('course')));
        });



    }
}

const app = new Controller(new Model(), new View());
