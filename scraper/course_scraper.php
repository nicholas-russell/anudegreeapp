<?php
error_reporting();

//$year = $argv[1];

if (isset($argv[1])) {
    $n = $argv[1];
} else {
    $n = -1;
}

//$year_array = array("2015","2016","2017","2018","2019","2020");
$year_array = array("2017","2018","2019","2020");
$course_array = array();

function getArrayFromSession($s) {
    $rtn = array();
    $i = 0;

}

foreach ($year_array as $year) {
    $url = "https://programsandcourses.anu.edu.au/data/CourseSearch/GetCourses?q=&ShowAll=true&SelectedYear=" . $year;
    print "GETTING COURSES FOR YEAR:" . $year . "\n";
    $context  = stream_context_create(array('http' => array('header' => 'Accept: application/xml')));
    $xmlString = file_get_contents($url, false, $context);
    $xml = simplexml_load_string($xmlString);
    $xml2 = $xml->children()->children();
    $i = 0;
    foreach ($xml2 as $element) {
        $course_array[$year][$i] = array(
            "c" => (string)$element->CourseCode,
            "n" => (string)$element->Name,
            "l" => substr((string)$element->Career, 0,1),
            "s" => explode("/",(string)$element->Session),
            "u" => (string)$element->Units,
            //"year" => (string)$element->Year,
        );
        $i++;
    }
    print "Courses loaded for " . $year . ": " . $i . "\n";
}

$fp = fopen("output/courses.min.json", 'w');
fwrite($fp,json_encode($course_array));
fclose($fp);

