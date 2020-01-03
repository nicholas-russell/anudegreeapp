const coursesUpdated = "03/01/2020";
const dataVersion = 4;

const startYearOptions = 2017;
const currentYearOptions = 2020;
const endYearOptions = 2025;

const defaultSessions = ["First Semester","Second Semester","Summer Session","Winter Session","Autumn Session","Spring Session"];
const orderedSessions = ["First Semester","Autumn Session","Winter Session","Second Semester","Spring Session","Summer Session"];
const gradeMarks = [7,6,5,4,0];
const gradeLabels = ["HD","D","C","P","N"];

jQuery.fn.fadeOutAndRemove = function(speed){
    $(this).fadeOut(speed,function(){
        $(this).remove();
    })
}

class Model {
    constructor() {
        this.save = {};
        this.courses = {};
        /*if (this.loadData()) {
            this.courses = store.get("courses");
        }*/
        this.loadData();
        this.defaultSessions = ["First Semester","Second Semester","Summer Session","Winter Session","Autumn Session","Spring Session"];
        this.orderedSessions = ["First Semester","Autumn Session","Winter Session","Second Semester","Spring Session","Summer Session"];
    }

    loadData() {
        // all data: ["courses","majors","minors","programs","specialisations"]
        const dataNames = ["courses"];
        for (let name of dataNames) {
            if (store.get(name) == null || store.get('dataVersion') < dataVersion) {
                $.getJSON("js/data/" + name + ".min.json", function (data) {
                    try {
                        store.set(name,data);
                    } catch(error) {
                        console.log(error);
                        $('#localStorageErrorCode').text(error);
                        $('#localStorageAlert').removeClass("d-none");
                        $('.localStorageErrorHide').addClass("d-none");
                        $('#getStartedAlert').alert('close');
                        $('#mobileAlert').alert('close');
                    }
                });
                store.set('dataVersion', dataVersion);
            }
        }
        for (let name of dataNames) {
            this[name] = store.get(name);
        }
    }

    _commit() {
        store.set('save',this.save);
    }

    setMark(mark, course, session, year) {
        if (!this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].hasOwnProperty("marks")) {
            this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].marks = {};
        }
        this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].marks[course] = mark;
        this._commit();
    }

    getMark(course, session, year) {
        let rtn = "";
        if (this.save.hasOwnProperty(year)) {
            let i = _.findIndex(this.save[year]["sessions"], {type: session});
            if (i !== -1) { // session exists
                if (this.save[year]["sessions"][i].hasOwnProperty("marks") && this.save[year]["sessions"][i].marks.hasOwnProperty(course)) {
                    rtn = this.save[year]["sessions"][i].marks[course];
                }
            }
        }
        return rtn;
    }

    addNewYear(year) {
        this.save[year] = {year: year, sessions: []};
        this._commit();
    }

    removeYear(year) {
        delete this.save[year];
        this._commit();
    }

    addNewSession(year, session) {
        this.save[year].sessions.push({type: session, courses: []});
        this._commit();
    }

    removeSession(year, session) {
        let tmp = this.save[year].sessions;
        this.save[year].sessions = _.filter(tmp,(s)=>{return s.type !== session; });
        this._commit();
    }

    addNewCourse(year, session, course) {
        this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].courses.push(course);
        this._commit();
    }

    removeCourse(year, session, course) {
        let tmp = this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].courses;
        this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].courses = _.without(tmp,course);
        this._commit();
    }

    getCourseModel(year, course) {
        let courseList = this.getCourseListForYear(year);
        return courseList[_.findIndex(courseList,{c:course})];
    }

    yearExists(year) {
        return this.save.hasOwnProperty(year);
    }

    sessionExists(year, session) {
        return this.yearExists(year) && (_.findIndex(this.save[year]["sessions"], {type: session}) !== -1)
    }

    getNewYearOptions() {
        let currentYears = this.getCurrentYears();
        let rtn = [];
        for (let yr = endYearOptions; yr >= startYearOptions; yr--) {
            rtn.push(yr + "");
        }
        return _.difference(rtn,currentYears);
    }

    getNewSessionOptions(year) {
        let currentSessions = [];

        for (let s of this.save[year].sessions) {
            currentSessions.push(s.type);
        }
        return _.difference(this.defaultSessions,currentSessions);
    }

    getCurrentYears() {
        return Object.keys(this.save);
    }

    getFilteredCourseList(year, sessions, codes, careers) {
        let courseArray = this.getCourseListForYear(year);
        return courseArray.filter((c) => {
           return   (sessions.some((s) => c.s.includes(s)) || sessions.length === 0)
            &&      (codes.includes(c.c.substr(0,4)) || codes.length === 0)
            &&      (careers.includes(c.l) || careers.length === 0);
        });
    }

    getCourseListForYear(year) {
        if (year > currentYearOptions) {
            return this.courses[currentYearOptions];
        } else {
            return this.courses[year];
        }
    }

    hasCourses(year, session) {
        return this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].courses.length !== 0;
    }

    hasSessions(year) {
        return Object.keys(this.save[year]["sessions"]).length !== 0;
    }

    getUnitSummary() {
        let rtn = {codes: {}, sessions: {}};
        for (let yr of Object.keys(this.save)) {
            rtn.sessions[yr] = {};
            for (let session of this.save[yr].sessions) {
                for (let course of session.courses) {
                    let details = this._getUnitDetails(course, yr);
                    if (!rtn.sessions[yr].hasOwnProperty(session.type)) {
                        rtn.sessions[yr][session.type] = 0;
                    }
                    rtn.sessions[yr][session.type] += parseInt(details.units);
                    if (!rtn.codes.hasOwnProperty(details.level)) {
                        rtn.codes[details.level] = {};
                    }
                    if (!rtn.codes[details.level].hasOwnProperty(details.faculty)) {
                        rtn.codes[details.level][details.faculty] = 0;
                    }
                    rtn.codes[details.level][details.faculty] += parseInt(details.units);
                }
            }
        }
        return rtn;
    }

    _getUnitDetails(code, year) {
        if (code.length !== 8) {
            console.warn(`${code} is not a valid course code`);
            return null;
        } else {
            let faculty = code.substr(0,4);
            let cat = code.substr(4,8);
            let level = cat.substr(0,1) + "000";
            let units = this.getCourseModel(year, code).u;
            return {faculty: faculty, cat: cat, level: level, units: units};
        }
    }

    courseCompleted(c, s, y) {
        let rtn = false;
        for (let year of Object.keys(this.save)) {
            if (y > year) {
                for (let session of this.save[year].sessions) {
                    for (let course of session.courses) {
                        if (course === c) {
                            rtn = true;
                            break;
                        }
                    }
                }
            } else if (y == year) {
                for (let session of this.save[year].sessions) {
                    if (_.indexOf(this.orderedSessions, s) >= _.indexOf(this.orderedSessions, session)) {
                        for (let course of session.courses) {
                            if (course === c) {
                                rtn = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
        return rtn;
    }

    calculateGPA(counts) {
        let totalCourses = 0;
        let totalMarks = 0;
        _.each(counts, (e,i) => {
            totalCourses += e;
            totalMarks += gradeMarks[i] * e;
        });
        return (totalCourses === 0 ? "0.000" : (totalMarks/totalCourses).toFixed(3));
    }

    calculateWam(marks) {
        let sum = 0;
        let size = marks.length;
        _.each(marks, (e)=> {
            sum += Number(e);
        });
        return (size === 0 ? "0.00" : (sum/size).toFixed(2));
    }

    getGradeFromMark(mark) {
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

    getMinimumGrades(grades,goalGpa,currentGpa,unitsCompleted, unitsAvailable) {
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

    getTableForPdf() {
        let rtn = "<table><tr><th scope='col'>Year</th><th scope='col'>Session</th><th scope='col'>Code</th><th scope='col'>Course</th></tr>";
        for (let yr of Object.keys(this.save)) {
            let yrPrinted = false;
            let yrCount = 0;
            for (let session of this.save[yr].sessions) {
                let ssnPrinted = false;
                let ssnCount = 0;
                for (let course of session.courses) {
                    let courseModel = app.model.getCourseModel(yr, course);
                    rtn += `<tr>`;
                    if (!yrPrinted) {
                        rtn += `<td rowspan='YRCOUNT'>${yr}</td>`;
                        yrPrinted = true;
                    }
                    if (!ssnPrinted) {
                        rtn += `<td rowspan='SSNCOUNT'>${session.type}</td>`;
                        ssnPrinted = true;
                    }
                    rtn += `<td>${course}</td><td>${courseModel.n} (${courseModel.u} units)</td>`;
                    rtn += `</tr>`;
                    ssnCount++;
                    yrCount++;
                }
                rtn = rtn.replace('SSNCOUNT', ssnCount);
            }
            rtn = rtn.replace("YRCOUNT",yrCount);
        }
        rtn += "</table>";
        return rtn;
    }

}

class View {
    constructor() {
        this.yearTabContentTemplate = _.template($('#yearTabContent-template').html());
        this.yearTabNavTemplate = _.template($('#yearTabNav-template').html());
        this.sessionTemplate = _.template($('#session-template').html());
        this.courseTemplate = _.template($('#course-template').html());
        this.wamRowTemplate = _.template($('#wamRowTemplate').html());
        this.wamManualRowTemplate = _.template($('#wamRowManualTemplate').html());

        this.courseModalSessionSelectId = $('#courseSelectSessionSelect');
        this.courseModalFacultySelectId = $('#courseSelectCodeSelect');
        this.courseModalCareerSelectId = $('#courseSelectCareerSelect');
        this.courseModalSearchId = $('#courseSelectCourseSelect');
        this.courseModalRequirements = $("#requirementsText");
        this.courseUpdateDate = $('#coursesUpdated');

        this.yearModal = $('#yearSelectModal');
        this.buttonAddYear = $('#add-year');
        this.buttonYearModalAdd = $('#newYearModalAddBtn');
        this.buttonYearModalCancel = $('#newYearModalCancelBtn');
        this.yearModalValue = $('#newYearSelect');

        this.sessionModal = $('#sessionSelectModal');
        this.buttonSessionModalAdd = $('#newSessionModalAddBtn');
        this.buttonSessionModalCancel = $('#newSessionModalCancelBtn');
        this.sessionModalValue = $('#newSessionSelect');

        this.courseModal = $('#courseSelectModal');
        this.courseModalHeader = $('#courseSelectHeader');
        this.buttonCourseModalAdd = $('#courseSelectModalAddBtn');
        this.buttonCourseModalCancel = $('#courseSelectModalCancelBtn');

        this.tabsNavPrependMarker = $('#tabNavPrepend ');
        this.tabsContentPrependMarker = $('#tabContents');

        this.courseModalSessionSelectInit = this.courseModalSessionSelectId.selectize({
            create: false
        });
        this.courseModalFacultySelectInit = this.courseModalFacultySelectId.selectize({
            create: false,
            sortField: 'text'
        });
        this.courseModalCareerSelectInit = this.courseModalCareerSelectId.selectize({
            create: false,
        });
        this.courseModalSearchInit = this.courseModalSearchId.selectize({
            create: false,
            searchField: ["c","n"],
            maxItems: 1,
            sortField: 'c',
            valueField: 'c',
            labelField: 'n',
            render: {
                item: (c, escape) => {
                    return `<div><strong>${escape(c.c)}</strong> ${escape(c.n)}</div>`;
                },
                option: (c, escape) => {;
                    return `<div class="ml-2 my-1">
                                <strong>${escape(c.c)}</strong>  ${escape(c.n)}
                                <br/>
                                <small><strong>Units: </strong> ${escape(c.u)}</small>
                                <small><strong>Sessions: </strong> ${escape(c.s)}</small>
                            </div>`;
                }
            }
        })

        this.courseModalSessionSelect = this.courseModalSessionSelectInit[0].selectize;
        this.courseModalFacultySelect = this.courseModalFacultySelectInit[0].selectize;
        this.courseModalCareerSelect = this.courseModalCareerSelectInit[0].selectize;
        this.courseModalSearchSelect = this.courseModalSearchInit[0].selectize;

        this.courseUpdateDate.html(coursesUpdated);
    }

    setInputOptions(id, array, selected, sort) {
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
        $(id).empty();
        $(id).html(output.join(''));
    }

    addNewYearTab(year) {
        this.tabsNavPrependMarker.before(this.yearTabNavTemplate({year: year.toString()}));
        this.tabsContentPrependMarker.prepend(this.yearTabContentTemplate({year: year.toString()}));
    }

    addSessionTable(year, session) {
        let data = {
            year: year,
            session: session,
            sessionID: session.replace(/ /g,"_")
        };
        this.getSessionTableId(year).append(this.sessionTemplate(data));
    }

    getSessionTableId(year) {
        return $(`#year-${year}-sessions`);
    }

    getCourseTableId(year, session) {
        let sessionID = session.replace(/ /g,"_");
        return $(`#${year}_${sessionID} tbody .courseTablePrepend`);
    }

    getYearTabId(year) {
        return $(`#year_${year}-nav`);
    }

    addCourseToTable(year, session, course) {
        let data = {
            code: course.c,
            name: course.n,
            units: course.u,
            year: year,
            session: session,
            sessionCode: session.replace(/ /g,"_"),
            dataYear: (year > currentYearOptions) ? currentYearOptions : year
        };
        this.getCourseTableId(year,session).before(this.courseTemplate(data));
    }

    showYearTab(year) {
        this.getYearTabId(year).tab('show');
    }

    removeCourse(year, session, course) {
        let s = session.replace(/ /g,"_");
        $(`#${year}_${s}_${course}`).fadeOutAndRemove('fast');
    }

    removeSession(year, session) {
        let s = session.replace(/ /g,"_");
        $(`#${year}_${s}`).fadeOutAndRemove('fast');
    }

    removeYear(year) {
        $(`#year_${year}-li`).fadeOutAndRemove('fast');
        $(`#year_${year}-tab`).fadeOutAndRemove('fast');
    }

    checkPrereqs(selector, year, session) {
        selector.find("a[data-coursecode]").each((i, e) => {
            let course = $(e).data('coursecode');
            if (app.model.courseCompleted(course, year, session)) {
                $(e).addClass("text-success");
            } else {
                $(e).addClass("text-danger");
            }
        });
    }

    renderUnitSummary(data) {
        $('#unitSummaryCodes').html("").html(this.generateHtmlTable(data.codes,"Level",true, true, (a,b) => {
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
        }));

        $('#unitSummarySessions').html("").html(this.generateHtmlTable(data.sessions, "Year", true, true, (a,b) => {
            return _.indexOf(defaultSessions, a) - _.indexOf(defaultSessions, b);
        }));


        let sessions = data.sessions;
        let sessionsTableRows = [];
        sessionsTableRows.push(Object.keys(sessions));

        let sessionsTableHeader = [];
    }

    generateHtmlTable(data, colLabel, rowTotal, colTotal, sort) {
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

    updateGPAFields(selector, value) {
        let courseLabelText = "";
        let totalUnitsText = "";
        let totalCoursesText = "";
        let totalUnits = this.gpaGetTotalUnits();
        if (value === 0) {
            courseLabelText = "";
        } else {
            courseLabelText = value > 1 ? value + " courses" : value + " course";
        }
        if (totalUnits === 0) {
            totalUnitsText = "0";
            totalCoursesText = "";
        } else {
            totalUnitsText = totalUnits;
            totalCoursesText = totalUnits > 6 ? totalUnits/6 + " courses" : totalUnits/6 + " course";
        }
        $(selector).closest(".form-group").find(".course-label").text(courseLabelText);
        $('#gpaModalTotalUnits').text(totalUnitsText);
        $('#gpaModalTotalCourses').text(totalCoursesText);
    }

    gpaGetTotalUnits() {
        let rtn = 0;
         $(".gpa-unit-entry").each((i, e) => {
            rtn += parseInt($(e).val());
        });
         return rtn;
    }

    renderWamTable(data) {
        $('#wamTable tbody').html("");
        let i = 0;
        for (let year of Object.keys(data)) {
            for (let session of data[year].sessions) {
                for (let course of session.courses) {
                    let courseData = app.model.getCourseModel(year, course);
                    let mark = app.model.getMark(course, session.type, year);
                    let data = {
                        code: course,
                        year: year,
                        session: session.type,
                        units: courseData.u,
                        name: courseData.n,
                        mark: mark,
                        grade: mark === "" ? "" : app.model.getGradeFromMark(mark)
                    };
                    $('#wamTable > tbody:last-child').append(this.wamRowTemplate(data));
                    i++;
                }
            }
        }
        if (i === 0) {
            $('#wamTable > tbody:last-child').append("<tr><td colspan='4'>Add courses to your planner to calculate WAM</td></tr>");
        }
    }

    addRowToWamManualTable() {
        $('#wamModalTableMarker').before(this.wamManualRowTemplate({}));
    }

    getGradeCounts() {
        return $('.gpa-unit-entry').map((i, e) => {
            return $(e).val()/6;
        }).get();
    }

}

class Controller {

    constructor(m, v) {
        this.model = m;
        this.view = v;

        this.currentYear = 2020;
        this.currentSession = "First Semester";

        if (store.get('save') != null) {
            this.model.save = store.get('save');
            this.loadSave(this.model.save);
            $('#getStartedAlert').alert('close');
        }
        $(function () {
            $('[data-toggle="tooltip"]').tooltip()
        });
        this.registerEvents();
    }

    loadSave(saveData) {
        let years = Object.keys(saveData);
        if (years.length !== 0) {
            for (let year of years) {
                this.view.addNewYearTab(year);
                for (let session of saveData[year].sessions) {
                    this.view.addSessionTable(year,session.type);
                    for (let course of session.courses) {
                        this.view.addCourseToTable(year,session.type,this.model.getCourseModel(year,course));
                    }
                }
            }
            this.view.showYearTab(years[0]);
        }
    }

    registerEvents() {
        const courseFilterUpdate = function() {
            app.view.courseModalSearchSelect.clearOptions();
            app.view.courseModalSearchSelect.clear(true);
            app.view.courseModalSearchSelect.addOption(app.model.getFilteredCourseList(
                app.currentYear,
                app.view.courseModalSessionSelect.items,
                app.view.courseModalFacultySelect.items,
                app.view.courseModalCareerSelect.items
            ));
        };

        const getPrereq = function() {
            $('#courseSelectReqText').addClass("d-none");
            let year = (app.currentYear > currentYearOptions ? currentYearOptions : app.currentYear);
            let course = app.view.courseModalSearchSelect.items[0];
            let url = `/req.php?c=${course}&y=${year}`;
            app.view.courseModalRequirements.html("");
            $.ajax({
                type: 'GET',
                url: url,
                beforeSend: () => {
                    $('#courseSelectReqSpinner').removeClass("d-none");
                },
                success: (data) => {
                    $('#courseSelectReqSpinner').addClass("d-none");
                    $('#courseSelectReqText').removeClass("d-none");
                    app.view.courseModalRequirements.html("").html(data);
                    app.view.checkPrereqs(app.view.courseModalRequirements, app.currentSession, app.currentYear);
                },
                error: (xhr) => {
                    console.error(xhr);
                },
                complete: () => {

                }

            });
        };

        this.view.buttonAddYear.on('click', ()=> {
            this.view.setInputOptions("#newYearSelect",this.model.getNewYearOptions(), currentYearOptions + "", false);
            this.view.yearModal.modal();
            this.view.buttonYearModalAdd.one('click', (e)=> {
                this.view.yearModal.hide();
                let newYear = this.view.yearModalValue.val();
                if (newYear != null) {
                    if (!this.model.yearExists(newYear)) {
                        this.model.addNewYear(newYear);
                        this.view.addNewYearTab(newYear);
                    } else {
                        this.view.showYearTab(newYear);
                    }
                    this.view.showYearTab(newYear);
                    $(e.target).blur();
                }
                this.view.buttonYearModalCancel.off('click');
            });

            this.view.buttonYearModalCancel.one('click', (e)=> {
                this.view.buttonYearModalAdd.off('click');
            });
        });

        $(document).on('click', '.add-session', (e)=> {
            const year = $(e.target).attr('data-year');
            this.view.setInputOptions("#newSessionSelect",this.model.getNewSessionOptions(year),null, false);
            this.view.sessionModal.modal();
            this.view.buttonSessionModalAdd.one('click', (e)=> {
                this.view.sessionModal.hide();
                let newSession = this.view.sessionModalValue.val();
                if (newSession != null) {
                    if (!this.model.sessionExists(year, newSession)) {
                        this.model.addNewSession(year, newSession);
                        this.view.addSessionTable(year, newSession);
                    } else {
                        // TODO: need to add a better UI here then just ignoring user
                    }
                    $(e.target).blur();
                }
                this.view.buttonSessionModalCancel.off('click');
            });

            this.view.buttonSessionModalCancel.one('click', (e)=> {
                this.view.buttonSessionModalAdd.off('click');
            });
        });

        this.view.courseModalSessionSelectId.on('change', courseFilterUpdate);
        this.view.courseModalFacultySelectId.on('change', courseFilterUpdate);
        this.view.courseModalCareerSelectId.on('change', courseFilterUpdate);
        this.view.courseModalSearchSelect.on('item_add', getPrereq);

        $(document).on('click', '.add-course', (e)=> {
            app.view.courseModalRequirements.html("");
            $('#courseSelectReqText').addClass("d-none");
            this.currentYear = $(e.target).closest('tr').data("year");
            this.currentSession = $(e.target).closest('tr').data("session");
            this.view.courseModalHeader.html(this.currentSession + " " + this.currentYear);

            this.view.courseModalSessionSelect.clear(true);
            this.view.courseModalSessionSelect.addItem(this.currentSession, false);

            this.currentYear > currentYearOptions ? $('#courseSelectWarning').removeClass('d-none') : $('#courseSelectWarning').addClass('d-none');
            this.view.courseModal.modal();
            this.view.buttonCourseModalAdd.one('click', (e)=> {
                this.view.courseModal.hide();
                let newCourse = this.view.courseModalSearchSelect.items[0];
                if (newCourse != null) {
                    this.model.addNewCourse(this.currentYear,this.currentSession,newCourse);
                    this.view.addCourseToTable(this.currentYear,this.currentSession,this.model.getCourseModel(this.currentYear,newCourse));
                    this.view.courseModalSearchSelect.clear(true);
                    $(e.target).blur();
                } else {

                }
                this.view.buttonCourseModalCancel.off('click');
            });
            this.view.buttonCourseModalCancel.one('click', (e)=> {
                this.view.buttonCourseModalAdd.off('click');
            });
        });

        $(document).on('click', '.removeCourse', (e)=>{
            let year = $(e.target).closest('tr').data("year");
            let session = $(e.target).closest('tr').data("session");
            let course = $(e.target).closest('tr').data("course");
            this.model.removeCourse(year,session,course);
            this.view.removeCourse(year,session,course);
        });

        $(document).on('click', '.removeSession', (e)=> {
            let year = $(e.target).closest('.session').data("year");
            let session = $(e.target).closest('.session').data("session");
            if (this.model.hasCourses(year, session)) {
                if (confirm(`Warning: ${session} in ${year} has courses selected.\nAre you sure you want to delete it?`)) {
                    this.model.removeSession(year,session);
                    this.view.removeSession(year,session);
                } else {}
            } else {
                this.model.removeSession(year,session);
                this.view.removeSession(year,session);
            }
        });

        $(document).on('click', '.removeYear', (e)=>{
            let year = $(e.target).data("year");
            if (this.model.hasSessions(year)) {
                if (confirm(`Warning: ${year} has sessions in it.\nAre you sure you want to delete it?`)) {
                    this.model.removeYear(year);
                    this.view.removeYear(year);
                }
            } else {
                this.model.removeYear(year);
                this.view.removeYear(year);
            }
        });

        $("#resetDataBtn").on('click', ()=> {
            if (confirm("Are you sure you want to reset?")) {
                for (let year of Object.keys(app.model.save)) {
                    this.model.removeYear(year);
                    this.view.removeYear(year);
                }
            }
        });

        $('#unitSummaryBtn').on('click', ()=> {
            this.view.renderUnitSummary(this.model.getUnitSummary());
           $('#unitSummaryModal').modal();
        });

        $('#gpaBtn').on('click', ()=> {
            app.view.renderWamTable(app.model.save);
            this.calculateWamGpa($('#wamModalEntryMode').is(':checked'), $('#wamModalExcl1000').is(':checked'));
            $('#gpaModal').modal();
        });

        $(".input-num-control").on('click', (e)=>{
            let selector = $(e.target).data("for");
            let action = $(e.target).data("action");
            if (action === "inc") {
                document.getElementById(selector).stepUp();
            } else {
                document.getElementById(selector).stepDown();
            }
        });

        $(".input-num-control[data-type='units']").on('click', (e)=> {
            let selector = $(e.target).data("for");
            if (document.getElementById(selector).value % 6 !== 0) {
                $("#"+selector).addClass("is-invalid");
                $('#gpaModalWarning').removeClass("d-none");
            } else {
                $('#gpaModalWarning').addClass("d-none");
                $("#"+selector).removeClass("is-invalid");
                let value = document.getElementById(selector).value/6;

                app.view.updateGPAFields(e.target, value);
                let grade = app.model.calculateGPA(app.view.getGradeCounts())
                $('#gpaModalManualGrade').text(grade);
                $('#gpaModalGoalGPA').val(grade);
            }
        });

        $('.gpa-unit-entry').on('change input', (e) => {
            if ($(e.target).val() % 6 !== 0) {
                $(e.target).addClass("is-invalid");
                $('#gpaModalWarning').removeClass("d-none");
            } else if ($(e.target).val() >= 0) {
                $(e.target).removeClass("is-invalid");
                $('#gpaModalWarning').addClass("d-none");
                let value = $(e.target).val()/6;

                app.view.updateGPAFields(e.target, value);
                let grade = app.model.calculateGPA(app.view.getGradeCounts());
                $('#gpaModalManualGrade').text(grade);
                $('#gpaModalGoalGPA').val(grade);
            }
        });

        $(document).on('input', '.wam-mark-input', (e)=>{
            let value = $(e.target).val();
            if (value.length > 3) {
                $(e.target).val(value.slice(0,3));
            }
            if (value > 100) {
                $(e.target).val(100);
            }
            if (value < 0) {
                $(e.target).val(0);
            }

            if (value === "") {
                $(e.target).parent().next().text("");
            } else {
                $(e.target).parent().next().text(app.model.getGradeFromMark(value));
            }

            if (!$('#wamModalEntryMode').is(':checked')) {
                let year = $(e.target).closest("tr").data("year");
                let session = $(e.target).closest("tr").data("session");
                let course = $(e.target).closest("tr").data("course");
                app.model.setMark(value,course,session,year);

            }

            this.calculateWamGpa($('#wamModalEntryMode').is(':checked'), $('#wamModalExcl1000').is(':checked'));
        });

        $('#wamModalEntryMode').on('change', (e)=> {
           if ($(e.target).is(':checked')) {
               $('#wamModalManualTable').removeClass("d-none");
               $('#wamModalAutoTable').addClass("d-none");
           } else {
               $('#wamModalManualTable').addClass("d-none");
               $('#wamModalAutoTable').removeClass("d-none");
           }
           this.calculateWamGpa($('#wamModalEntryMode').is(':checked'), $('#wamModalExcl1000').is(':checked'));
        });

        $('#wamModalExcl1000, .wam-table-input-unit, .wam-table-input-level').on('change', ()=> {
            this.calculateWamGpa($('#wamModalEntryMode').is(':checked'), $('#wamModalExcl1000').is(':checked'));
        });

        $('#wamModalManualAddCourse').on('click', ()=>{
            app.view.addRowToWamManualTable();
        });

        $('#gpaModalGoalSubmit').on('click', ()=>{
           let currentGPA = app.model.calculateGPA(app.view.getGradeCounts());
           let currentUnits = app.view.gpaGetTotalUnits()/6;
           let goal = $('#gpaModalGoalGPA').val();
           let unitsAvailable = 4*$('#gpaModalGoalSemesters').val();
           let grades = [0,0,0,0,unitsAvailable];
           //console.log(`currentGPA: ${currentGPA}, currentUnits: ${currentUnits}, gpaGoal: ${goal}, unitsAv: ${unitsAvailable}, grades: ${grades}`);
           let result = app.model.getMinimumGrades(grades,goal,currentGPA,currentUnits,unitsAvailable);
           if (result.result) {
                $('#gpaModalGoalResultGpa')
                    .addClass("text-success")
                    .removeClass("text-danger")
                    .val(result.gpa);
           } else {
               $('#gpaModalGoalResultGpa')
                   .removeClass("text-success")
                   .addClass("text-danger")
                   .val(result.gpa);
           }
           $('#gpaModalGoalResultGpa').text("").text(result.gpa);
           $('#gpaModalGoalResults').removeClass("d-none");
           $('#gpaModalGoalResultText1').text("");
           $('#gpaModalGoalResultText2').text("");
           let n = 1;
           $.each(result.grades, (i,e) => {
               if (e === 0) {
                   return true;
               } else {
                   $('#gpaModalGoalResultText' + n).text(`${e} x ${(gradeLabels[i])}`);
                   n++;
               }
           });

        });

        $('#pdfBtn').on('click', ()=>{
            let doc = new jsPDF();
            $('#pdfTable').html(app.model.getTableForPdf());
            let marginX = 14;
            doc.setFontSize(22);
            doc.text("ANU Degree Plan",marginX,22);
            doc.autoTable({
                html: '#pdfTable table',
                startY: 28,
                styles: {cellWidth: 'wrap'},
                theme: 'grid',
            });

            doc.save('anu_plan.pdf');
        });

    }

    calculateWamGpa(manual, fstYear) {
        let marks = [];
        let grades = [0,0,0,0,0];
        if (manual) {
            $('#wamTableManual .wam-mark-input').each((i,e)=>{
                let x = $(e).val();
                let l = $(e).closest("tr").find(".wam-table-input-level").val();
                let u = $(e).closest("tr").find(".wam-table-input-unit").val();
                if (x !== "") {
                    if (fstYear && l === "1000") {
                        return true;
                    } else {
                        for (let i = 0; i < u/6; i++) {
                            marks.push(x);
                        }
                        grades[gradeLabels.indexOf(app.model.getGradeFromMark(x))] += u/6;
                    }
                }

            });
        } else {
            $('#wamTable .wam-mark-input').each((i, e)=>{
                let x = $(e).val();
                let u = $(e).closest("tr").data('units');
                let l = $(e).closest("tr").data('course').charAt(4);
                if (x !== "") {
                    if (fstYear && l === "1") {
                        return true;
                    } else {
                        for (let i = 0; i < u/6; i++) {
                            marks.push(x);
                        }
                        grades[gradeLabels.indexOf(app.model.getGradeFromMark(x))] += u/6;
                    }
                }
            });
        }

        $('#wamModalGPA').text("").text(app.model.calculateGPA(grades));
        $('#wamModalWAM').text("").text(app.model.calculateWam(marks));
    }
}

class Year {
    constructor(year,sessions) {
        this.year = year;
        this.sessions = sessions;
    }
}

const app = new Controller(new Model(), new View());