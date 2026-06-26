<?php
$json = '["บุคลากร", "ผู้ดูแลระบบ"]';
$decoded = json_decode($json, true);
var_dump($decoded);
if (is_array($decoded)) {
    echo "Is Array\n";
} else {
    echo "Is NOT Array\n";
}
