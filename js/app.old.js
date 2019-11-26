const dataNames = ["courses","majors","minors","programs","specialisations"];
var currentCourse = null;
var currentYear = "2020";
var currentSession = "First Semester";
var model = {};

for (var name of dataNames) {
    if (store.get(name) == null) {
        loadData(name);
    } else {
        console.log(name + " already loaded");
    }
}
const majors = store.get("majors");
const minors = store.get("minors");
const specs = store.get("specs");
const courses = store.get("courses");
const programs = store.get("programs");


function loadData(f) {
    $.getJSON("js/data/" + f + ".min.json", function (data) {
        store.set(f,data);
    });
}

function getCourseCodes(y) {
    return Object.keys(courses[y]);
}

function setOptions(id,array) {
    array.sort();
    var output = [];
    $.each(array, function(key, value)
    {
        output.push('<option value="'+ value +'">'+ value +'</option>');
    });
    $(id).empty();
    $(id).html(output.join(''));
}


function yearUpdated(selector, result) {
    console.log("year updated");
    currentYear = $(selector).val().toString();
    setOptions(result,getCourseCodes(currentYear));
    resetCourse();
}

function sessionUpdated(selector,result) {
    currentSession = $(selector).val();
}

function resetCourse() {
    $('#course_name').empty();
    $('#course_level').empty();
    $('#course_session').empty();
    $('#course_units').empty();
}

function updateCourseInfo(k) {
    currentCourse = $(k).val();
    var course = courses[$('#year').val()][$(k).val()];
    console.log(course);
    $('#course_name').text(course["name"]);
    $('#course_level').text(course["level"]);
    $('#course_session').text(course["session"]);
    $('#course_units').text(course["units"]);
}

function addCourseBtn() {
    addCourseToModel(currentYear,currentSession,currentCourse);
    var course = courses[currentYear][currentCourse];
    $('#course_table tbody').append("<tr><td>" + currentSession +"</td><td>" + currentCourse + "</td><td>" + course["name"] + "</td><td>" + course["units"] + "</td></tr>");
    currentCourse = null;
    resetCourse();
}

function addToTable() {
    const m = store.get('model');
    console.log(m);
    Object.keys(m).forEach(yr=>{
        Object.keys(m[yr]).forEach(s=>{
            Object.keys(m[yr][s]).forEach(c=>{
                var code = m[yr][s][c]["code"];
                var course = courses[yr][code];
                $('#course_table tbody').append("<tr><td>" + s +"</td><td>" + c + "</td><td>" + course["name"] + "</td><td>" + course["units"] + "</td></tr>");
            });
        });
    });
}

function addCourseToModel(year, session, course) {
    console.log(model.hasOwnProperty(year));
    if (!(model.hasOwnProperty(year))) {
        model[year] = {};
    }
    if (!(model[year].hasOwnProperty(session))) {
        model[year][session] = {};
    }
    model[year][session][course] = {code: course};
    store.set("model",model);
}

class Controller {

    constructor(m, v) {
        this.model = m;
        this.view = v;

        if (store.get('model') != null) {
            m.save = store.get('model');
            v.addToTable();
        }

        $('#year').on('change', ()=> {
            yearUpdated('#year', '#course_select');
        });
        $('#course_select').on('change', ()=> {
            updateCourseInfo('#course_select')
        })
    }
}

class Model {
    constructor() {
        this.save = {};
        if (store.get('model') != null) {
            this.save = store.get('model');
        }
    }

    addCourseToModel(year, session, course) {
        console.log(this.model.hasOwnProperty(year));
        if (!(this.model.hasOwnProperty(year))) {
            model[year] = {};
        }
        if (!(this.model[year].hasOwnProperty(session))) {
            this.model[year][session] = {};
        }
        this.model[year][session][course] = {code: course};
        store.set("model",this.model);
    }
}

class View {
    constructor() {
        setOptions("#course_select",getCourseCodes(currentYear));
    }

    addToTable() {
        const m = store.get('model');
        console.log(m);
        Object.keys(m).forEach(yr=>{
            Object.keys(m[yr]).forEach(s=>{
                Object.keys(m[yr][s]).forEach(c=>{
                    var code = m[yr][s][c]["code"];
                    var course = courses[yr][code];
                    $('#course_table tbody').append("<tr><td>" + s +"</td><td>" + c + "</td><td>" + course["name"] + "</td><td>" + course["units"] + "</td></tr>");
                });
            });
        });
    }

}

class Session {
    constructor(type) {
        this.type = type;
        this.courses = [];
    }

    addCourse(course) {
        this.courses.push(course);
    }
}

class Year {
    constructor() {

    }
}

const app = new Controller(new Model(), new View());

const test = new Session("Semester 1");
test.addCourse("COMP1110");
test.addCourse("COMP1100");
test.addCourse("COMP1000");

console.log(test);

