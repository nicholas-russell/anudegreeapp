<?php

$file = "programs";
$min_year = 2017;

$json = file_get_contents($file . ".json");

$arr = json_decode($json, true);
$result = array();

foreach ($arr as $key=>$value) {
    if ($key >= $min_year) {
        $i = 0;
        foreach ($value as $code=>$details) {
            $result[$key][$i] = array(
                "c" => $code,
                "n" => $details["name"],
                "l" => $details["level"]
            );
            $i++;
        }
    }
}

$fp = fopen($file . time() . ".json", 'w');
fwrite($fp,json_encode($result));
fclose($fp);