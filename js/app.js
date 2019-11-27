const coursesUpdated = "18/11/2019";

const startYearOptions = 2015;
const currentYearOptions = 2020;
const endYearOptions = 2025;

class Model {
    constructor() {
        this.save = {};
        this.prereqs = {};
        this.loadData();
        this.courses = store.get('courses');
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
        /*this.save[year] = new Year(year,[]);*/
        this.save[year] = {year: year, sessions: []};
        this._commit();
    }

    addNewSession(year, session) {
        /*this.save[year].sessions.push(new Session(session, []));*/
        this.save[year].sessions.push({type: session, courses: []});
        this._commit();
    }

    addNewCourse(year, session, course) {
        this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].courses.push(course);
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
        const defaultSessions = ["First Semester","Second Semester","Summer Session","Winter Session","Autumn Session","Spring Session"];

        for (let s of this.save[year].sessions) {
            currentSessions.push(s.type);
        }
        return _.difference(defaultSessions,currentSessions);
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

    async getPrereq(year,code) {
        if (this.prereqs.hasOwnProperty(year)) {
            if (this.prereqs[year].hasOwnProperty(code)) {
                console.log("cached");
                return this.prereqs[year][code];
            }
        } else {
            console.log("not cached");
            let url = 'https://cors-anywhere.herokuapp.com/' + "https://programsandcourses.anu.edu.au/" + year + "/course/" + code;
            let html = "";
            $.ajax({
                type: 'GET',
                url: url,
                dataType: 'text/html',
                beforeSend:function(){
                    // this is where we append a loading image
                    console.log("sending");
                },
                success:function(data){
                    // successful request; do something with the data
                    let parser = new DOMParser();
                    let source = parser.parseFromString(data,'text/html');
                    let html = source.getElementsByClassName("requisite");
                    let rtn = html[0].innerHTML;
                    this.prereqs[year] = {};
                    this.prereqs[year][code] = rtn;
                    return rtn;
                }.bind(this),
                error:function(){
                    // failed request; give feedback to user
                    return "Error loading prerequisites";
                }
            });

        }
    }

}

class View {
    constructor() {
        this.yearTabContentTemplate = _.template($('#yearTabContent-template').html());
        this.yearTabNavTemplate = _.template($('#yearTabNav-template').html());
        this.sessionTemplate = _.template($('#session-template').html());
        this.courseTemplate = _.template($('#course-template').html());

        this.courseModalSessionSelectId = $('#courseSelectSessionSelect');
        this.courseModalFacultySelectId = $('#courseSelectCodeSelect');
        this.courseModalCareerSelectId = $('#courseSelectCareerSelect');
        this.courseModalSearchId = $('#courseSelectCourseSelect');
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
                option: (c, escape) => {
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
        this.getSessionTableId(year).append(this.sessionTemplate({year: year, session: session, sessionID: session.replace(/ /g,"_")}));
    }

    getSessionTableId(year) {
        return $(`#year-${year}-sessions`);
    }

    getCourseTableId(year, session) {
        let sessionID = session.replace(/ /g,"_");
        return $(`#${sessionID}_${year} tbody .courseTablePrepend`);
    }

    getYearTabId(year) {
        return $(`#year_${year}-nav`);
    }

    addCourseToTable(year, session, course) {
        this.getCourseTableId(year,session).before(this.courseTemplate({code: course.code, name: course.name, units: course.units}));
    }

    showYearTab(year) {
        this.getYearTabId(year).tab('show');
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

        this.registerEvents();
    }

    loadSave(saveData) {
        for (let year of Object.keys(saveData)) {
            this.view.addNewYearTab(year);
            for (let session of saveData[year].sessions) {
                this.view.addSessionTable(year,session.type);
                for (let course of session.courses) {
                    this.view.addCourseToTable(year,session.type,this.model.getCourseModel(year,course));
                }
            }
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

        $(document).on('click', '.add-course', (e)=> {
            this.currentYear = $(e.target).closest('tr').data("year");
            this.currentSession = $(e.target).closest('tr').data("session");
            this.view.courseModalHeader.html(this.currentSession + " " + this.currentYear);
            this.view.courseModalSessionSelect.clear(true);
            this.view.courseModalSessionSelect.addItem(this.currentSession, false);
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
    }
}

class Year {
    constructor(year,sessions) {
        this.year = year;
        this.sessions = sessions;
    }
}

const app = new Controller(new Model(), new View());
