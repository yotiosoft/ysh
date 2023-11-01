var args = [];
var dirs = [];
var current_dir = "/";

function boot() {
    var shell = document.getElementById('shell_input');

    // ディレクトリの初期化
    dirs["/"] = [];

    // 入力完了時の動作
    shell.addEventListener('keyup', on_key_press);

    // 起動時の表示
    printshell("ysh ver.0.1\n");
    printshell("(c) YotioSoft 2022-2023 All rights reserved.\n\n");
    printshell("To see the list of commands, run \"help\" command.\n\n");
}

function printshell(str) {
    var shell = document.getElementById('shell_input');
    shell.value += str;
    shell.scrollTop = shell.scrollHeight;
}

function shellclear() {
    var shell = document.getElementById('shell_input');
    shell.value = "";
}

function waiting() {
    // 引数配列をクリア
    args = [];

    // 入力受付状態を示す
    printshell("> ");
}

function on_key_press(e) {
    if (e.key == 'Enter') {
        onInputCompleted();

        return true;
    }
    return false;
}

function onInputCompleted() {
    var shell = document.getElementById('shell_input');

    // パースを行う
    var lines = shell.value.replace(/\r\n|\r/g,"\n").split('\n');
    var last_line = lines[lines.length - 2].substring(2);
    var ret = parse(last_line);

    if (!ret) {
        printshell("command not found: " + last_line.split(" ")[0] + '\n');
    }

    // 次の入力へ
    waiting();
}

function parse(str) {
    // パース
    args = str.split(" ");

    // 実行
    try {
        func_obj[args[0]]();
        return true;
    }
    catch {
        return false;
    }
}

function get_arg(num) {
    return args[num];
}

var func_obj = [];

func_obj["cd"] = function() {
    if (get_arg(1) in dirs) {
        current_dir = get_arg(1);
    }
    else {
        printshell(get_arg(1) + " not found.\n");
    }
}

func_obj["clear"] = function() {
    shellclear();
}

func_obj["echo"] = function() {
    for (var i=1; i<args.length; i++) {
        printshell(get_arg(i) + " ");
    }
    printshell("\n");
}

func_obj["hello"] = function() {
    printshell("Hello!\n");
}

func_obj["help"] = function() {
    // func_objに登録されたコマンド一覧を表示
    printshell(Object.keys(func_obj).length + " commands exist:\n");

    for (cmd in func_obj) {
        printshell(cmd + "\n");
    }
}

func_obj["ls"] = function() {
    for (var i=0; i<dirs[current_dir].length; i++) {
        printshell(dirs[current_dir][i]+ "\n");
    }
}

func_obj["mkdir"] = function() {
    dirs[current_dir + get_arg(1) + "/"] = [];
    dirs[current_dir].push(current_dir + get_arg(1) + "/");
}

func_obj["pwd"] = function() {
    printshell(current_dir + "\n");
}
