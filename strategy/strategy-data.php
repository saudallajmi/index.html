<?php
/* =========================================================================
   strategy-data.php — خادم بوابة الخطة الاستراتيجية
   ========================================================================= */
const OWNER_USER      = "admin";
const OWNER_PASS_HASH = '$2y$12$M9/7FJ.S3VTDKQdWJE47Xu6OIbGrFIHmQfrTPUNy9.iACFz3K8VyW';
const DATA_FILE       = __DIR__ . "/strategy-data.json";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(204); exit; }

function out($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readState() {
    if (!file_exists(DATA_FILE)) return defaultState();
    $j = json_decode(file_get_contents(DATA_FILE), true);
    if (!is_array($j)) return defaultState();
    $d = defaultState();
    foreach ($d as $k => $v) { if (!isset($j[$k])) $j[$k] = $v; }
    return $j;
}

function defaultState() {
    return [
        "identity"        => ["vision"=>"","mission"=>"","values"=>[]],
        "pillars"         => [],
        "perspectives"    => [],
        "orientations"    => [],
        "goals"           => [],
        "initiatives"     => [],
        "portfolios"      => [],
        "exec_plans"      => [],
        "oper_goals"      => [],
        "kpi_library"     => [],
        "milestone_types" => [],
        "kpi_options"        => ["polarities"=>[],"cumulatives"=>[],"frequencies"=>[],"departments"=>[],"data_sources"=>[]],
        "initiative_options" => ["classifications"=>[],"exec_types"=>[],"follow_up_tags"=>[],"approval_auths"=>[],"media_coverages"=>[]],
        "kpi_reports"        => [],
        "change_log"      => [],
        "users"           => [],
        "updated_at"      => null,
    ];
}

function writeState($data) {
    $data["updated_at"] = gmdate("c");
    $tmp = DATA_FILE . ".tmp";
    $ok = file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    if ($ok === false) return false;
    if (!@rename($tmp, DATA_FILE)) { @unlink($tmp); return false; }
    return $data;
}

function authenticate($username, $password, $state) {
    if ($username === OWNER_USER && password_verify($password, OWNER_PASS_HASH)) {
        return ["role" => "owner", "username" => OWNER_USER];
    }
    foreach ($state["users"] as $u) {
        if (isset($u["username"], $u["password"])
            && $u["username"] === $username
            && password_verify($password, (string)$u["password"])) {
            return ["role" => "user", "username" => $u["username"]];
        }
    }
    return null;
}

function publicData($s) {
    return [
        "identity"        => $s["identity"],
        "pillars"         => $s["pillars"],
        "perspectives"    => $s["perspectives"],
        "orientations"    => $s["orientations"],
        "goals"           => $s["goals"],
        "initiatives"     => $s["initiatives"],
        "portfolios"      => $s["portfolios"],
        "exec_plans"      => $s["exec_plans"],
        "oper_goals"      => $s["oper_goals"],
        "kpi_library"     => $s["kpi_library"],
        "milestone_types" => $s["milestone_types"],
        "kpi_options"        => $s["kpi_options"],
        "initiative_options" => $s["initiative_options"] ?? ["classifications"=>[],"exec_types"=>[],"follow_up_tags"=>[],"approval_auths"=>[],"media_coverages"=>[]],
        "kpi_reports"        => $s["kpi_reports"],
        "change_log"      => $s["change_log"],
        "updated_at"      => $s["updated_at"],
    ];
}

function saveUploadedFile($base64, $filename) {
    $dir = __DIR__ . "/uploads";
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $ext  = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($filename, PATHINFO_FILENAME));
    $name = $safe . '_' . time() . '.' . $ext;
    $data = base64_decode(preg_replace('/^data:[^;]+;base64,/', '', $base64));
    if ($data === false || strlen($data) > 20 * 1024 * 1024) return null;
    file_put_contents($dir . '/' . $name, $data);
    return 'strategy/uploads/' . $name;
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    out(publicData(readState()));
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $body = json_decode(file_get_contents("php://input"), true);
    if (!is_array($body)) out(["err" => "طلب غير صالح"], 400);

    $action   = isset($body["action"])   ? $body["action"]           : "";
    $username = isset($body["username"]) ? (string)$body["username"] : "";
    $password = isset($body["password"]) ? (string)$body["password"] : "";
    $state    = readState();

    if ($action === "login") {
        $sess = authenticate($username, $password, $state);
        if (!$sess) out(["err" => "اسم المستخدم أو كلمة المرور غير صحيحة"], 403);
        $res = ["ok" => true, "role" => $sess["role"], "username" => $sess["username"]];
        if ($sess["role"] === "owner") $res["users"] = $state["users"];
        out($res);
    }

    if ($action === "save") {
        $sess = authenticate($username, $password, $state);
        if (!$sess) out(["err" => "غير مصرّح"], 403);
        $fields = ["identity","pillars","perspectives","orientations","goals","initiatives",
                   "portfolios","exec_plans","oper_goals","kpi_library","milestone_types",
                   "kpi_options","initiative_options","kpi_reports","change_log"];
        foreach ($fields as $f) {
            if (array_key_exists($f, $body)) $state[$f] = $body[$f];
        }
        $res = writeState($state);
        if ($res === false) out(["err" => "تعذّر الحفظ — تحقّق من صلاحيات المجلد"], 500);
        out(publicData($res));
    }

    if ($action === "saveUsers") {
        $sess = authenticate($username, $password, $state);
        if (!$sess || $sess["role"] !== "owner") out(["err" => "المالك فقط"], 403);
        if (!isset($body["users"]) || !is_array($body["users"])) out(["err" => "بيانات غير صالحة"], 400);
        $clean = [];
        foreach ($body["users"] as $u) {
            if (!isset($u["username"]) || trim((string)$u["username"]) === "") continue;
            if ($u["username"] === OWNER_USER) continue;
            $pw = (string)(isset($u["password"]) ? $u["password"] : "");
            $isHash = (bool)preg_match('/^\$2[aby]\$\d{2}\$/', $pw);
            $clean[] = [
                "username" => trim((string)$u["username"]),
                "password" => $isHash ? $pw : password_hash($pw, PASSWORD_BCRYPT),
            ];
        }
        $state["users"] = $clean;
        $res = writeState($state);
        if ($res === false) out(["err" => "تعذّر الحفظ"], 500);
        out(["ok" => true, "users" => $res["users"]]);
    }

    if ($action === "upload") {
        $sess = authenticate($username, $password, $state);
        if (!$sess) out(["err" => "غير مصرّح"], 403);
        if (empty($body["file_data"]) || empty($body["file_name"])) out(["err" => "بيانات الملف مفقودة"], 400);
        $url = saveUploadedFile($body["file_data"], $body["file_name"]);
        if (!$url) out(["err" => "تعذّر رفع الملف"], 500);
        out(["ok" => true, "url" => $url, "name" => $body["file_name"]]);
    }

    out(["err" => "إجراء غير معروف"], 400);
}

out(["err" => "طريقة غير مدعومة"], 405);
