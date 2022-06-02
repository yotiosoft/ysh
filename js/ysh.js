var args = [];

function boot() {
    var shell = document.getElementById('shell_input');

    // 入力完了時の動作
    shell.addEventListener('keyup', on_key_press);

    // 起動時の表示
    printshell("ysh ver.0.1\n");
    printshell("(c) YotioSoft 2022 All rights reserved.\n\n");
    printshell("To see the list of commands, run \"help\" command.\n\n");
}

function printshell(str) {
    var shell = document.getElementById('shell_input');
    shell.value += str;
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
