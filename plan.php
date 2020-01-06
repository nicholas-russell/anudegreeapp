<?php

require ('php/simple_html_dom.php');

if (!isset($_GET['y'], $_GET['c'], $_GET['t'])) {
    echo "Error: not enough parameters supplied.";
} else {
    $url = "https://programsandcourses.anu.edu.au/" . $_GET['y'] . "/" . $_GET['t'] . "/" . $_GET['c'];
    $html = file_get_html($url);
    if (count($html->find("span[class=molecule__label]")) === 0) {
        echo "Error: 404 (url: " . $url . ").";
    } else {
        if ($_GET['t'] === "program") {
            $start = $html->find("h2[id=program-requirements]",0);
        } else {
            $start = $html->find("h2[id=requirements]",0);
        }

        /*if (count($start) === 0) { // 404 error
            echo "There is no requirements or perquisites for this course on ANU Programs and Courses.";
        } else {*/
            while ( $next = $start->next_sibling() ) {
                // And as long as it's different from the end node => div.second
                if ( ($next->tag == 'a' && $next->class == 'back-to-top') || ($next->tag == 'h2') )
                    break;
                else{
                    foreach ($next->find('a[href]') as $a) {
                        if (substr($a->href,0,4) !== "http") {
                            $href = $a->href;
                            $a->href = "https://programsandcourses.anu.edu.au/" . $href;
                            $a->setAttribute("target","_blank");
                            $code = substr($href, -8);
                            if (preg_match("/^[A-Z]{4}\d{4}$/", $code)) { // well formed course code
                                $a->setAttribute("data-coursecode", $code);
                            }
                        }
                    }

                    // Print the content
                    echo $next;
                    // And move to the next node
                    $start = $next;
                }
            }

            //echo $start[0];
        /*}*/
    }
}




