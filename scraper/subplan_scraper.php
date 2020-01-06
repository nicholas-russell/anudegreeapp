<?php
$year_array = array("2015","2016","2017","2018","2019","2020");
$plan_array = array("Major","Minor","Specialisation");

foreach ($plan_array as $plan) {
    $result = array();
    foreach ($year_array as $year) {
        $url = "https://programsandcourses.anu.edu.au/data/" . $plan . "Search/Get" . $plan . "s?q=&ShowAll=true&SelectedYear=" . $year;
        print "GETTING " . $plan . "s FOR YEAR:" . $year . "\n";
        $context  = stream_context_create(array('http' => array('header' => 'Accept: application/xml')));
        $xmlString = file_get_contents($url, false, $context);
        $xml = simplexml_load_string($xmlString);
        $xml2 = $xml->children()->children();
        $i = 0;
        foreach ($xml2 as $element) {
            $result[$year][(string)$element->SubPlanCode] = array(
                "name" => (string)$element->Name,
                "level" => (string)$element->Career,
                "units" => (string)$element->Units,
            );
            $i++;
        }
        print $plan . "s loaded for " . $year . ": " . $i . "\n";
    }

    $fp = fopen("output/" . strtolower($plan) . "s.min.json", 'w');
    fwrite($fp,json_encode($result));
    fclose($fp);
}



