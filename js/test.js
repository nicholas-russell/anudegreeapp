/**
 *
 * degree_plan = {
 *     courses = {
 *         years = [
 *             0: {
 *                 name = "2020",
 *                 dataName = 2020,
 *                 sessions: [
 *                     0: {
 *                         name = "First Semester",
 *                         dataName = "First Semester",
 *                         courses: [
 *                             0: {
 *                                 name = ""
 *                                 mark = null
 *                             },
 *                             1: etc...
 *                         ]
 *                     },
 *                     1: etc...
 *                 ]
 *             },
 *             1: etc...
 *         ]
 *     }
 * }
 *
 */


const model = {
   courses: {
      years: []
   }
};

const LEVEL_TYPES = {
   YEAR: "year",
   SESSION: "session",
   COURSE: "course"
};

function Year(name, dataName) {
   return {
      name: name,
      dataName: dataName,
      type: LEVEL_TYPES.YEAR,
      sessions: []
   }
}

function Session(name, dataName) {
   return {
      name: name,
      dataName: dataName,
      type: LEVEL_TYPES.SESSION,
      courses: []
   }
}

function Course(name, mark=undefined) {
   return {
      name: name,
      mark: mark
   }
}

const defaultSessions = ["First Semester","Second Semester","Summer Session","Winter Session","Autumn Session","Spring Session"];
const possibleGrades = ["HD", "D", "CR", "P", "PS", "CRS", "HLP", "N", "NCN", "WD", "WL", "WN", "KU", "RC", "STE", "STI", "EE"];

function getText() {
   return $('#text-input').val()
}

function cleanHeaders(strArr) {
   if (strArr[0] === "    Semester / Session") {
      return _.rest(strArr, 9);
   } else {
      return strArr;
   }
}

function removeRedundant(strArr) {
   return _.filter(strArr, (str) => {
      return isSessionYear(str) || isMark(str) || isCourseCode(str) && str !== ""
   });
}

function isCourseCode(str) {
   return /^([A-Z]{4}[0-9]{4})$/.test(str);
}

function isSessionYear(str) {
   let arr = str.split(", ");
   return defaultSessions.includes(arr[0]) && /^(20[0-9]{2})$/.test(arr[1]) && arr.length === 2;
}

function getSessionYear(str) {
   return str.split(", ")
}

function isMark(str) {
   return /^([0-9]{1,2})$|^100$/.test(str);
}

function isGrade(str) {
   return possibleGrades.includes(str);
}

function isUnits(str) {
   return str === "6.00" | str === "12.00";
}

function addYear(yearName, yearDataName=yearName) {
   if (getYearIndex(yearName) === -1) {
      return model.courses.years.push(Year(yearName, yearDataName)) -1;
   } else {
      console.warn(`Warning: ${yearName} already exists`);
      return false;
   }
}

function getYearIndex(year) {
   return _.findIndex(model.courses.years, (yearIteration) => {
      return yearIteration.name === year;
   });
}

function addSession(year, sessionName, force=false, sessionDataName=sessionName) {
   let yearIndex = getYearIndex(year);
   if (yearIndex === -1) {
      console.warn(`Warning: ${year} does not exist to add ${sessionName} to`);
      if (force) {
         console.warn('--> Adding anyway as force is true');
         yearIndex = addYear(year);
      } else {
         return false;
      }
   }
   if(getSessionIndex(year, sessionName) === -1) {
      return model.courses.years[yearIndex].sessions.push(Session(sessionName, sessionDataName)) - 1;
   } else {
      console.warn(`Warning: ${sessionName} in ${year} already exists!`);
      return false;
   }

}

function getSessionIndex(year, session, yearIndexValue=undefined) {
   let yearIndex = yearIndexValue === undefined ? getYearIndex(year) : yearIndexValue;
   if (yearIndex === -1) { // year does not exist, returns -2
      console.error(`Error: ${year} does not exist to check ${session} against!`);
      return -2;
   } else {
      return _.findIndex(model.courses.years[yearIndex].sessions, (sessionIteration) => {
         return sessionIteration.name === session;
      });
   }
}

function addCourse(year, session, course, force=false, mark=undefined) {
   let yearIndex = getYearIndex(year);
   if (yearIndex === -1) {
      console.warn(`Warning: ${year} does not exist`);
      if (force) {
         console.log(model);
         yearIndex = addYear(year);
      } else {
         return false;
      }
   }
   let sessionIndex = getSessionIndex(year, session, yearIndex);
   if (sessionIndex === -1) {
      console.warn(`Warning: ${year} ${session} does not exist`)
      if (force) {
         sessionIndex = addSession(year,session);
      }
   }
   return model.courses.years[yearIndex].sessions[sessionIndex].courses.push(Course(course, mark)) -1;
}

function parseArr(strArr) {
   strArr.forEach((str, ind) => {
      if (isSessionYear(str)) {
         let arr = getSessionYear(str);
         let year = arr[1];
         let session = arr[0];
         let course = strArr[ind+1];
         let mark = undefined;
         if (!isSessionYear(strArr[ind+2])) {
            mark = strArr[ind+2]
         }
         addCourse(year, session, course, true, mark);
      }
   });
}

$(document).ready(function() {
   $('#submit-btn').on('click', () => {
      let arr = getText().split("\n")
      arr = cleanHeaders(arr)
      arr = removeRedundant(arr)
      console.log(parseArr(arr))
   });
});


