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

function renderTemplate(html, data) {
    Object.keys(data).forEach((key) => {
        let regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, data[key]);
    });
    return html;
}

function getPlanRequirements(year, plan, type) {

}

function getCourseRequirements(year, code) {
    return $.get(`/req.php?c=${code}&y=${year}`)
        .fail((res) => {
            console.log(res);
            return false;
        });
}

async function testAjax(year, code) {
    let response = await getCourseRequirements(year, code);
    console.log(response);
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

    /**
     * Adds a year to the model store
     * @param year The year to add
     * @param dataSource The year to source data from, default to same as year
     * @returns {number} Returns index of added year, or -1 if year already exists.
     */
    addYear(year, dataSource=this.getYearDataSource(year)) {
        if (this.getYearIndex(year) === RETURN_CODES.NOT_EXISTS.YEAR) {
            this._evalAndCommit(this.store.years.push(Year(year, dataSource)) -1);
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
        console.log(yearIndex);
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
                wamRow: undefined,
                wamManualRow: undefined,
            },
            modals: {
                course: {
                    search: {},
                    plan: {}
                },
                year: {},
                session: {},
                requirements: {},
                import: {}
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
            tabContent: $('#tabContents')
        }
    }

    addYear(year) {
        let data = {year: year};
        this.page.tabNav.find('li:last').before(this.page.tmpl.yearTab.get(data));
        this.page.tabContent.append(this.page.tmpl.year.get(data));
        this.showTab(year);
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
        let v = this.view.page;

        v.nav.addYear.click(() => {
            console.log("adding year");
        });

        v.nav.gpa.click((e) => {
            console.log("gpa button");
        });
        v.nav.import.click(async (e) => {
            console.log("import");
        });
        v.nav.plan.click((e) => {
            console.log("plan");
        });
        v.nav.saveCSV.click((e) => {
            console.log("save csv");
        });
        v.nav.savePdf.click((e) => {
            console.log("save csv");
        });
        v.nav.reset.click((e) => {
            console.log("resetting");
        });

        v.nav.unitSummary.click((e) => {
            console.log("unit summary");
        });




        $(document).on('click', '[data-action=remove-year]', (e) => {
            console.log("removing year");
        });

        $(document).on('click', '[data-action=add-session]', (e) => {
            console.log("adding session");
        });

        $(document).on('click', '[data-action=remove-session]', (e) => {
            console.log('removing session');
        });

        $(document).on('click', '[data-action=add-course]', (e) => {
           console.log("adding course");
        });

        $(document).on('click', '[data-action=remove-course]', (e) => {
            console.log("removing course");
        });






    }
}

const app = new Controller(new Model(), new View());
