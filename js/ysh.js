var args = [];
var dirs = [];
var current_dir = "/root/";

const shell_fd = 0;
var current_fd = shell_fd;
var fd_buffers = [];
class FileDescriptor {
    fd_number;
    fd_buffer;
    output_file;

    constructor() {
        this.fd_number = fd_buffers.length;
        this.fd_buffer = "";
        this.output_file = "";
    }

    add_line(str) {
        this.fd_buffer += str;
    }

    clear() {
        this.fd_buffer = "";
    }
}

const TYPE_FILE = 0;
const TYPE_DIR = 1;
class FileSystemObject {
    name;
    fullpath;
    type;
    content;

    constructor(name, full_path, type) {
        this.name = name;
        this.fullpath = full_path;
        this.type = type;
        this.content = [];
    }

    set_content(obj) {
        this.content = obj;
    }
}

function boot() {
    var shell = document.getElementById('shell_input');

    // ディレクトリの初期化
    dirs["/root/"] = [];

    // 入力完了時の動作
    shell.addEventListener('keydown', on_key_press);

    // シェルの初期化
    fd_buffers[shell_fd] = new FileDescriptor();

    // 起動時の表示
    printfd("ysh ver.0.1\n");
    printfd("(c) YotioSoft 2022-2023 All rights reserved.\n\n");
    printfd("To see the list of commands, run \"help\" command.\n\n");
}

function newfd() {
    var fd = new FileDescriptor();
    fd_buffers.push(fd);
    return fd.fd_number;
}

function switchfd(shell_index) {
    if (fd_buffers[current_fd].output_file != "") {
        output_file(current_fd);
    }
    current_fd = shell_index;
    if (current_fd == shell_fd) {
        updateshell();
    }
}

function printfd(str) {
    fd_buffers[current_fd].fd_buffer += str;
    if (current_fd == shell_fd) {
        updateshell();
    }
}

function updateshell() {
    var shell = document.getElementById('shell_input');
    shell.value = fd_buffers[shell_fd].fd_buffer;
    shell.scrollTop = shell.scrollHeight;
}

function shellclear() {
    fd_buffers[current_fd].fd_buffer = "";
    if (current_fd == shell_fd) {
        updateshell();
    }
}

function waiting() {
    // 引数配列をクリア
    args = [];

    // 入力受付状態を示す
    printfd("> ");
}

function on_key_press(e) {
    fd_buffers[current_fd].fd_buffer = document.getElementById('shell_input').value;
    if (e.key == 'Enter' && !e.isComposing) {
        e.preventDefault();
        onInputCompleted();

        return true;
    }
    return false;
}

function onInputCompleted() {
    fd_buffers[current_fd].fd_buffer = document.getElementById('shell_input').value;

    // パースを行う
    var lines = fd_buffers[current_fd].fd_buffer.replace(/\r\n|\r/g,"\n").split('\n');
    var last_line = lines[lines.length - 1].substring(2);
    fd_buffers[current_fd].fd_buffer += '\n';
    if (current_fd == shell_fd) {
        updateshell();
    }
    var ret = parse_and_run(last_line);

    //if (ret == 1) {
    //    printfd("command returns an error.\n");
    //}

    // 次の入力へ
    waiting();
}

function parse_and_run(str) {
    // '>' を含む場合は fd を生成・変更
    if (str.includes(">")) {
        var fd_num = newfd();
        var output_file_name = str.split(">")[1].trim();
        fd_buffers[fd_num].output_file = output_file_name;
        switchfd(fd_num);
        str = str.split(">")[0];
    }

    // パース
    args = str.split(" ");

    // 実行
    if (args[0] in func_obj) {
        var ret = func_obj[args[0]]();
        switchfd(shell_fd);
        return ret;
    }
    printfd("command not found: " + args[0] + '\n');
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
            resoving_path.pop();
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

// ディレクトリ内のファイル名を取得
function names_in_dir(dir) {
    var names = [];
    for (var i=0; i<dirs[dir].length; i++) {
        names.push(dirs[dir][i].name);
    }
    return names;
}
function fullparh_in_dir(dir) {
    var fullpaths = [];
    for (var i=0; i<dirs[dir].length; i++) {
        fullpaths.push(dirs[dir][i].fullpath);
    }
    return fullpaths;
}

// 仮想ファイルを出力
function output_file(fd_num) {
    var output_file_name = fd_buffers[fd_num].output_file;
    var file_object = new FileSystemObject(output_file_name, current_dir + output_file_name, TYPE_FILE);
    file_object.set_content(fd_buffers[fd_num].fd_buffer);
    dirs[current_dir].push(file_object);
}

// 絶対パス・相対パスからファイルを取得
function get_file(path) {
    // カレントディレクトリ内
    for (var i=0; i<dirs[current_dir].length; i++) {
        if (dirs[current_dir][i].name == path) {
            return dirs[current_dir][i];
        }
    }
    // カレントディレクトリ外
    var full_path = parse_path(path);
    var parent_dir = full_path.split("/").slice(0, -2).join("/") + "/";
    var file_name = full_path.split("/").slice(-2, -1)[0];
    if (dirs[parent_dir] == undefined) {
        return null;
    }
    for (var i=0; i<dirs[parent_dir].length; i++) {
        if (dirs[parent_dir][i].name == file_name) {
            return dirs[parent_dir][i];
        }
    }
    return null;
}

var func_obj = [];

func_obj["cd"] = function() {
    var names = names_in_dir(current_dir);
    if (get_arg(1) in names) {
        // 絶対パス
        current_dir = get_arg(1);
    }
    else {
        // 相対パス
        var path = parse_path(get_arg(1));
        console.log(path);
        var fillpaths = fullparh_in_dir(current_dir);
        console.log(fillpaths);
        console.log(path);
        for (var i=0; i<fillpaths.length; i++) {
            if (fillpaths[i] == path) {
                current_dir = path;
                return 0;
            }
        }
    }
    printfd(get_arg(1) + " not found.\n");
    return 1;
}

func_obj["clear"] = function() {
    shellclear();
    return 0;
}

func_obj["echo"] = function() {
    for (var i=1; i<args.length; i++) {
        printfd(get_arg(i) + " ");
    }
    printfd("\n");
    return 0;
}

func_obj["hello"] = function() {
    printfd("Hello!\n");
    return 0;
}

func_obj["help"] = function() {
    // func_objに登録されたコマンド一覧を表示
    printfd(Object.keys(func_obj).length + " commands exist:\n");

    for (cmd in func_obj) {
        printfd(cmd + "\n");
    }
    return 0;
}

func_obj["ls"] = function() {
    var names = names_in_dir(current_dir);
    for (var i=0; i<names.length; i++) {
        printfd(names[i]+ "\n");
    }
    return 0;
}

func_obj["mkdir"] = function() {
    dirs[current_dir + get_arg(1) + "/"] = [];
    var new_dir = new FileSystemObject(get_arg(1), current_dir + get_arg(1) + "/", TYPE_DIR);
    dirs[current_dir].push(new_dir);
    return 0;
}

func_obj["pwd"] = function() {
    printfd(current_dir + "\n");
    return 0;
}

func_obj["cat"] = function() {
    var filepath= get_arg(1);
    var file = get_file(filepath);
    if (file != null) {
        printfd(file.content + "\n");
        return 0;
    }
    printfd(filepath + " not found.\n");
    return 1;
}
