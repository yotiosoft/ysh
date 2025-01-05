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
    printfd("ysh ver.1.0\n");
    printfd("(c) YotioSoft 2022-2025 All rights reserved.\n\n");
    printfd("To see the list of commands, type 'help'.\n");
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

function parse_path(path_str, type) {
    var path = path_str.split("/");

    // 絶対パスの場合
    // /root/ からのパスを解決
    if (path[0] == "") {
        var start_dir = "";
    }
    // 相対パスの場合
    // カレントディレクトリを起点にしてパスを解決
    else {
        var start_dir = current_dir;
    }
    // 相対パスの場合
    // カレントディレクトリを起点にしてパスを解決
    var resoving_path = start_dir.split("/");
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
    if (type == TYPE_FILE) {
        ret_path_str = ret_path_str.substring(0, ret_path_str.length - 1);
    }

    return ret_path_str;
}

// ディレクトリ内のファイル名を取得
function names_in_dir(dir) {
    var names = [];
    if (dir in dirs) {
        for (var i=0; i<dirs[dir].length; i++) {
            names.push(dirs[dir][i].name);
        }
    }
    return names;
}
function fullpath_in_dir(dir) {
    var fullpaths = [];
    if (dir in dirs) {
        for (var i=0; i<dirs[dir].length; i++) {
            fullpaths.push(dirs[dir][i].fullpath);
        }
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
    var full_path = parse_path(path, TYPE_FILE);
    console.log("get_file: " + full_path);
    var parent_dir = get_parent_dir(full_path);
    var file_name = get_last_dir(full_path);
    console.log(full_path, parent_dir, file_name);
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

// 親ディレクトリを取得
function get_parent_dir(path) {
    // 最後が '/' で終わっていなければ追加
    if (path[path.length - 1] != "/") {
        path += "/";
    }
    var path = path.split("/");
    var parent_dir = path.slice(0, -2).join("/") + "/";
    return parent_dir;
}

// ファイルパスから最後のディレクトリ名を取得
function get_last_dir(path) {
    // 最後が '/' で終わっていなければ追加
    if (path[path.length - 1] != "/") {
        path += "/";
    }
    var path = path.split("/");
    return path.slice(-2, -1)[0];
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
        var path = parse_path(get_arg(1), TYPE_DIR);
        for (let key in dirs) {
            if (key == path) {
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
    var path = current_dir;
    if (args.length > 1) {
        path = parse_path(get_arg(1), TYPE_DIR);
    }
    var fullpaths = fullpath_in_dir(path);
    for (var i=0; i<fullpaths.length; i++) {
        printfd(fullpaths[i] + "\n");
    }
    return 0;
}

func_obj["mkdir"] = function() {
    // '/' が含まれている場合はパスを解決
    if (get_arg(1).includes("/")) {
        var parent_dir = get_parent_dir(get_arg(1));
        var dir_name = get_last_dir(get_arg(1));
        dirs[parent_dir + dir_name + "/"] = [];
        var new_dir = new FileSystemObject(dir_name, parent_dir + dir_name + "/", TYPE_DIR);
        dirs[parent_dir].push(new_dir);
        return 0;
    }
    // それ以外はカレントディレクトリに作成
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
