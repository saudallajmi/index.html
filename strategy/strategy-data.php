<?php
/* =========================================================================
   strategy-data.php — خادم بوابة الخطة الاستراتيجية
   التخزين: strategy-data.json
   البنية: { identity, pillars, orientations, goals, portfolios,
             exec_plans, oper_goals, users, updated_at }
   العمليات (POST JSON):
     login       {username,password}
     save        {username,password,data}   => حفظ كامل (المالك)
     saveUsers   {username,password,users}  => إدارة المستخدمين (المالك)
   GET => يرجّع كل البيانات بدون كلمات مرور (قراءة عامة)
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
        "identity"     => ["vision"=>"","mission"=>"","values"=>[]],
        "pillars"      => [],
        "orientations" => [],
        "goals"        => [],
        "portfolios"   => [],
        "exec_plans"   => [],
        "oper_goals"   => [],
        "users"        => [],
        "updated_at"   => null,
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
        "identity"     => $s["identity"],
        "pillars"      => $s["pillars"],
        "orientations" => $s["orientations"],
        "goals"        => $s["goals"],
        "portfolios"   => $s["portfolios"],
        "exec_plans"   => $s["exec_plans"],
        "oper_goals"   => $s["oper_goals"],
        "updated_at"   => $s["updated_at"],
    ];
}

// ===== GET =====
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $s = readState();
    out(publicData($s));
}

// ===== POST =====
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $body = json_decode(file_get_contents("php://input"), true);
    if (!is_array($body)) out(["err" => "طلب غير صالح"], 400);

    $action   = isset($body["action"])   ? $body["action"]            : "";
    $username = isset($body["username"]) ? (string)$body["username"]  : "";
    $password = isset($body["password"]) ? (string)$body["password"]  : "";
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
        $fields = ["identity","pillars","orientations","goals","portfolios","exec_plans","oper_goals"];
        foreach ($fields as $f) {
            if (isset($body[$f])) $state[$f] = $body[$f];
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
            $clean[] = [
                "username" => trim((string)$u["username"]),
                "password" => password_hash((string)(isset($u["password"]) ? $u["password"] : ""), PASSWORD_BCRYPT),
            ];
        }
        $state["users"] = $clean;
        $res = writeState($state);
        if ($res === false) out(["err" => "تعذّر الحفظ"], 500);
        out(["ok" => true, "users" => $res["users"]]);
    }

    out(["err" => "إجراء غير معروف"], 400);
}

out(["err" => "طريقة غير مدعومة"], 405);
