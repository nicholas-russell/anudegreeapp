const coursesUpdated = "18/11/2019";

const startYearOptions = 2015;
const currentYearOptions = 2020;
const endYearOptions = 2025;

class Model {
    constructor() {
        this.save = {};
        this.prereqs = {};
        if (store.get('model') != null) {
            this.save = store.get('model');
            $('#getStartedAlert').alert('close');
        }
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

    addNewYear(year) {
        this.save[year] = new Year(year,[]);
    }

    addNewSession(year, session) {
        this.save[year].addSession(new Session(session, []));
    }

    addNewCourse(year, session, course) {
        this.save[year]["sessions"][_.findIndex(this.save[year]["sessions"], {type: session})].addCourse(course);
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
        const defaultSessions = ["First Semester","Second Semester","Summer","Winter","Autumn","Spring"];

        for (let s of this.save[year].sessions) {
            currentSessions.push(s.type);
        }
        return _.difference(defaultSessions,currentSessions);
    }

    getCurrentYears() {
        return Object.keys(this.save);
    }

    getFilteredCourseList(year, sessions, codes) {
        let courseArray = this.courses[year];
        let rtn = courseArray.filter((c) => {
           return   (sessions.some((s) => c.session.includes(s)) || sessions.length === 0)
            &&      (codes.includes(c.code.substr(0,4)) || codes.length === 0)
        });
        return rtn;
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
        this.courseModalSearchInit = this.courseModalSearchId.selectize({
            create: false,
            maxItems: 1
        })

        this.courseModalSessionSelect = this.courseModalSessionSelectInit[0].selectize;
        this.courseModalFacultySelect = this.courseModalFacultySelectInit[0].selectize;
        this.courseModalSearchSelect = this.courseModalSearchInit[0].selectize;

        this.courseUpdateDate.html(coursesUpdated);
    }

    _initSelectize() {

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

    addCourseToTable(year, session, course, code) {
        this.getCourseTableId(year,session).before(this.courseTemplate({code: code, name: course["name"], units: course["units"]}));
    }

    showYearTab(year) {
        this.getYearTabId(year).tab('show');
    }

}

class Controller {

    constructor(m, v) {
        this.model = m;
        this.view = v;

        if (store.get('save') != null) {
            m.save = store.get('save');
            // update the viewer with the model
        }
        this.registerEvents();
        // Set

    }

    registerEvents() {
        this.view.buttonAddYear.on('click', (e)=> {
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

        $('#courseSelectSessionSelect').on('change', () => {
            console.log($('#courseSelectSessionSelect').val());
        });

        $('#courseSelectCodeSelect').on('change', () => {
            console.log($('#courseSelectCodeSelect').val());
        });

        $(document).on('click', '.add-course', (e)=> {
            let year = $(e.target).closest('tr').data("year");
            let session = $(e.target).closest('tr').data("session");
            this.view.courseModalHeader.html(session + " " + year);
            this.view.courseModalSessionSelect.clear(true);
            this.view.courseModalSessionSelect.addItem(session, false);
            this.view.courseModal.modal();
            this.view.buttonCourseModalAdd.one('click', (e)=> {
                this.view.courseModal.hide();
                let newCourse = this.view.courseModalSearchSelect.items[0];
                if (newCourse != null) {
                    $(e.target).blur();
                }
                this.view.buttonCourseModalCancel.off('click');
            });

            this.view.buttonCourseModalCancel.one('click', (e)=> {
                this.view.buttonCourseModalAdd.off('click');
            });
        });
    }
}

class Session {
    constructor(type, courses) {
        this.type = type;
        this.courses = courses;
    }

    addCourse(course) {
        this.courses.push(course);
    }
}

class Year {
    constructor(year,sessions) {
        this.year = year;
        this.sessions = sessions;
    }

    addSession(s) {
        this.sessions.push(s);
    }
}

const app = new Controller(new Model(), new View());
