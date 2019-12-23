const coursesUpdated = "18/11/2019";

const startYearOptions = 2015;
const currentYearOptions = 2020;
const endYearOptions = 2025;

const defaultSessions = ["First Semester","Second Semester","Summer Session","Winter Session","Autumn Session","Spring Session"];
const orderedSessions = ["First Semester","Autumn Session","Winter Session","Second Semester","Spring Session","Summer Session"];
const gradeMarks = [7,6,5,4,0];

jQuery.fn.fadeOutAndRemove = function(speed){
    $(this).fadeOut(speed,function(){
        $(this).remove();
    })
}

class Model {
    constructor() {
        this.save = {};
        this.prereqs = {};
        this.loadData();
        this.courses = store.get('courses');
        this.defaultSessions = ["First Semester","Second Semester","Summer Session","Winter Session","Autumn Session","Spring Session"];
        this.orderedSessions = ["First Semester","Autumn Session","Winter Session","Second Semester","Spring Session","Summer Session"];
    }

    loadData() {
        // all data: ["courses","majors","minors","programs","specialisations"]
        const dataNames = ["courses"];
        for (let name of dataNames) {
            if (store.get(name) == null || md5(store.get(name)) !== store.get(name + "_md5")) {
                $.getJSON("js/data/" + name + ".min.json", function (data) {
                    store.set(name,data);
                    store.set(name + "_md5",md5(data));
                });
                console.log(`${name} loaded from JSON`);
            } else {
                console.log(`${name} loaded from localstorage`);
            }
        }
    }

    _commit() {
        store.set('save',this.save);
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
        /*this.save[year].sessions.push(new Session(session, []));*/
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
        return courseList[_.findIndex(courseList,{code:course})];
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
           return   (sessions.some((s) => c.session.includes(s)) || sessions.length === 0)
            &&      (codes.includes(c.code.substr(0,4)) || codes.length === 0)
            &&      (careers.includes(c.level) || careers.length === 0);
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
            let units = this.getCourseModel(year, code).units;
            return {faculty: faculty, cat: cat, level: level, units: units};
        }
    }

    courseCompleted(c, s, y) {
        let rtn = false;
        for (let year of Object.keys(this.save)) {
            if (y > year) {
                console.log(`checking ${year} all sessions`);
                for (let session of this.save[year].sessions) {
                    console.log(`checking ${year} for ${session.type}`);
                    for (let course of session.courses) {
                        if (course === c) {
                            rtn = true;
                            break;
                        }
                    }
                }
            } else if (y == year) {
                console.log(`checking ${year} only some sessions`);
                for (let session of this.save[year].sessions) {
                    if (_.indexOf(this.orderedSessions, s) >= _.indexOf(this.orderedSessions, session)) {
                        console.log(`checking ${year} for ${session.type}`);
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
        _.each(counts, (e,i,l) => {
            totalCourses += e;
            totalMarks += gradeMarks[i] * e;
        });
        return (totalCourses === 0 ? "0.000" : (totalMarks/totalCourses).toFixed(3));
    }
}

class View {
    constructor() {
        this.yearTabContentTemplate = _.template($('#yearTabContent-template').html());
        this.yearTabNavTemplate = _.template($('#yearTabNav-template').html());
        this.sessionTemplate = _.template($('#session-template').html());
        this.courseTemplate = _.template($('#course-template').html());
        this.wamRowTemplate = _.template($('#wamRowTemplate').html());

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
            searchField: ["code","name"],
            maxItems: 1,
            sortField: 'code',
            valueField: 'code',
            labelField: 'name',
            render: {
                item: (c, escape) => {
                    return `<div><strong>${escape(c.code)}</strong> ${escape(c.name)}</div>`;
                },
                option: (c, escape) => {;
                    return `<div class="ml-2 my-1">
                                <strong>${escape(c.code)}</strong>  ${escape(c.name)}
                                <br/>
                                <small><strong>Units: </strong> ${escape(c.units)}</small>
                                <small><strong>Sessions: </strong> ${escape(c.session)}</small>
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
            code: course.code,
            name: course.name,
            units: course.units,
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
        console.log(year + session + course);
        let s = session.replace(/ /g,"_");
        $(`#${year}_${s}_${course}`).fadeOutAndRemove('fast');
    }

    removeSession(year, session) {
        console.log(year + session);
        let s = session.replace(/ /g,"_");
        $(`#${year}_${s}`).fadeOutAndRemove('fast');
    }

    removeYear(year) {
        console.log(year);
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
        let totalUnits = 0;
        $(".gpa-unit-entry").each((i, e) => {
            totalUnits += parseInt($(e).val());
        });
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

    renderWamTable(data) {
        $('#wamTable tbody').html("");
        let i = 0;
        for (let year of Object.keys(data)) {
            for (let session of data[year].sessions) {
                for (let course of session.courses) {
                    let courseData = app.model.getCourseModel(year, course);
                    let data = {
                        code: course,
                        index: i,
                        units: courseData.units,
                        name: courseData.name,
                        mark: "",
                        grade: ""
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
            //this.view.showYearTab(years[0]);
        }
    }

    registerEvents() {
        const courseFilterUpdate = function() {
            this.view.courseModalSearchSelect.clearOptions();
            this.view.courseModalSearchSelect.clear(true);
            this.view.courseModalSearchSelect.addOption(this.model.getFilteredCourseList(
                this.currentYear,
                this.view.courseModalSessionSelect.items,
                this.view.courseModalFacultySelect.items,
                this.view.courseModalCareerSelect.items
            ));
        }.bind(this);

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
                    console.log(xhr);
                },
                complete: () => {
                    console.log("complete");
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
                } else {}
            } else {
                this.model.removeYear(year);
                this.view.removeYear(year);
            }
        });

        $("#resetData").on('click', ()=> {

        });

        $('#unitSummaryBtn').on('click', ()=> {
            this.view.renderUnitSummary(this.model.getUnitSummary());
           $('#unitSummaryModal').modal();
        });

        $('#gpaBtn').on('click', ()=> {
            app.view.renderWamTable(app.model.save);
            $('#gpaModal').modal();
        });

        $('.input-num-control').on('click', (e)=> {
            let selector = $(e.target).data("for");
            let action = $(e.target).data("action");
            if (action === "inc") {
                document.getElementById(selector).stepUp();
            } else {
                document.getElementById(selector).stepDown();
            }

            if (document.getElementById(selector).value % 6 !== 0) {
                $("#"+selector).addClass("is-invalid");
                $('#gpaModalWarning').removeClass("d-none");
            } else {
                $('#gpaModalWarning').addClass("d-none");
                $("#"+selector).removeClass("is-invalid");
                let value = document.getElementById(selector).value/6;
                app.view.updateGPAFields(e.target, value);
                let gradeCounts = $('.gpa-unit-entry').map((i, e) => {
                    return $(e).val()/6;
                }).get();
                let grade = app.model.calculateGPA(gradeCounts);
                console.log(grade);
                $('#gpaModalManualGrade').text(grade);
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
                let gradeCounts = $('.gpa-unit-entry').map((i, e) => {
                    return $(e).val()/6;
                }).get();
                let grade = app.model.calculateGPA(gradeCounts);
                console.log(grade);
                $('#gpaModalManualGrade').text(grade);
            }
        });

        $(document).on('change input', '.wam-mark-input', (e)=>{
            let value = $(e.target).val();
            console.log(value);
            if (value.length > 3) {
                $(e.target).val(value.slice(0,3));
            }
            if (value > 100) {
                $(e.target).val(100);
            }
            if (value < 0) {
                $(e.target).val(0);
            }
        });
    }
}

class Year {
    constructor(year,sessions) {
        this.year = year;
        this.sessions = sessions;
    }
}

const app = new Controller(new Model(), new View());