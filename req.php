<?php

require ('php/simple_html_dom.php');

if (!isset($_GET['y'], $_GET['c'])) {
    echo "Error: not enough parameters supplied.";
} elseif (strlen($_GET['y']) !== 4 || strlen($_GET['c']) !== 8) {
    echo "Error: One or more parameters supplied have incorrect lengths (year: " . $_GET['y'] . ", course: " . $_GET['c'] . ").";
} else {
    $url = "https://programsandcourses.anu.edu.au/" . $_GET['y'] . "/course/" . $_GET['c'];
    $html = file_get_html($url);
    if (count($html->find("span[class=molecule__label]")) === 0) {
        echo "Error: 404 (url: " . $url . ").";
    } else {
        $req = $html->find("div[class=requisite]");
        if (count($req) === 0) { // 404 error
            echo "There is no requirements or perquisites for this course on ANU Programs and Courses.";
        } else {
            foreach ($req[0]->find('a[href]') as $a) {
                $href = $a->href;
                $a->href = "https://programsandcourses.anu.edu.au/" . $href;
                $a->setAttribute("target","_blank");
                $code = substr($href, -8);
                if (preg_match("/^[A-Z]{4}\d{4}$/", $code)) { // well formed course code
                    $a->setAttribute("data-coursecode", $code);
                }
            }
            echo $req[0];
        }
    }
}




