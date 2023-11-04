var args = [];
var dirs = [];
var current_dir = "/root/";

function boot() {
    var shell = document.getElementById('shell_input');

    // ディレクトリの初期化
    dirs["/root/"] = [];

    // 入力完了時の動作
    shell.addEventListener('keydown', on_key_press);

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
    if (e.key == 'Enter' && !e.isComposing) {
        e.preventDefault();
        onInputCompleted();

        return true;
    }
    return false;
}

function onInputCompleted() {
    var shell = document.getElementById('shell_input');

    // パースを行う
    var lines = shell.value.replace(/\r\n|\r/g,"\n").split('\n');
    var last_line = lines[lines.length - 1].substring(2);
    shell.value += '\n';
    var ret = parse_and_run(last_line);

    //if (ret == 1) {
    //    printshell("command returns an error.\n");
    //}

    // 次の入力へ
    waiting();
}

function parse_and_run(str) {
    // パース
    args = str.split(" ");

    // 実行
    if (args[0] in func_obj) {
        return func_obj[args[0]]();
    }
    printshell("command not found: " + args[0] + '\n');
    return 1;
}

function get_arg(num) {
    return args[num];
}

function parse_path(path_str) {
    var path = path_str.split("/");
    console.log(path_str);
    console.log(path);

    // カレントディレクトリを起点にしてパスを解決
    var resoving_path = current_dir.split("/");
    if (resoving_path[resoving_path.length - 1] == "") {
        resoving_path.pop();
    }
    for (var i=0; i<path.length; i++) {
        if (path[i] == ".") {
            // 何もしない
            continue;
        }
        else if (path[i] == "..") {
            // 一つ上のディレクトリに移動
            console.log("  bpop " + resoving_path);
            resoving_path.pop();
            console.log("  apop " + resoving_path);
        }
        else {
            resoving_path.push(path[i]);
        }
    }

    // パス文字列を生成
    var ret_path_str = "/";
    for (var i=0; i<resoving_path.length; i++) {
        if (resoving_path[i] == "") {
            continue;
        }
        ret_path_str += resoving_path[i] + "/";
    }

    return ret_path_str;
}

var func_obj = [];

func_obj["cd"] = function() {
    if (get_arg(1) in dirs) {
        // 絶対パス
        current_dir = get_arg(1);
    }
    else {
        // 相対パス
        var path = parse_path(get_arg(1));
        console.log(path);
        if (path in dirs) {
            current_dir = path;
        }
        else {
            printshell(get_arg(1) + " not found.\n");
            return 1;
        }
    }
    return 0;
}

func_obj["clear"] = function() {
    shellclear();
    return 0;
}

func_obj["echo"] = function() {
    for (var i=1; i<args.length; i++) {
        printshell(get_arg(i) + " ");
    }
    printshell("\n");
    return 0;
}

func_obj["hello"] = function() {
    printshell("Hello!\n");
    return 0;
}

func_obj["help"] = function() {
    // func_objに登録されたコマンド一覧を表示
    printshell(Object.keys(func_obj).length + " commands exist:\n");

    for (cmd in func_obj) {
        printshell(cmd + "\n");
    }
    return 0;
}

func_obj["ls"] = function() {
    for (var i=0; i<dirs[current_dir].length; i++) {
        printshell(dirs[current_dir][i]+ "\n");
    }
    return 0;
}

func_obj["mkdir"] = function() {
    dirs[current_dir + get_arg(1) + "/"] = [];
    dirs[current_dir].push(current_dir + get_arg(1) + "/");
    return 0;
}

func_obj["pwd"] = function() {
    printshell(current_dir + "\n");
    return 0;
}
