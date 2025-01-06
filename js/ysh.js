var args = [];
var dirs = [];
var current_dir = "/root/";

const EDITOR_HEADER = [
    "Ctrl+S to save and exit. Ctrl+C to exit without saving.\n",
    "------------------------------------------------------\n"
]

const shell_fd = 0;
var current_fd = shell_fd;
var fd_buffers = [];
const MODE_SHELL = 0;
const MODE_EDIT = 1;
var shell_mode = MODE_SHELL;
const DEST_SHELL = 0;
const DEST_FILE = 1;

class FileDescriptor {
    fd_number;
    fd_buffer;
    output_file;
    dest;

    constructor(dest) {
        this.fd_number = fd_buffers.length;
        this.fd_buffer = "";
        this.output_file = "";
        this.dest = dest;
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

    // LocalStorage からデータを読み込み
    //let ls_exists = load_from_localstorage();
    let ls_exists = false;

    // データがない場合は初期化
    if (!ls_exists) {
        // ディレクトリの初期化
        dirs["/root/"] = [];

        // ファイルの用意
        var readme_txt = new FileSystemObject("readme.txt", "/root/readme.txt", TYPE_FILE);
        readme_txt.set_content("Welcome to ysh!\nThis is a fake shell for web browser made with JavaScript.\nFiles and directories are virtual and they are not stored in the server.\nYsh is still under development and buggy, so I will fix them as soon as possible.\nI hope you enjoy using ysh.");
        add_file(readme_txt, "/root/");
        var profile_txt = new FileSystemObject("profile.txt", "/root/profile.txt", TYPE_FILE);
        profile_txt.set_content("I'm yotio, a computer-science student in Japan.\nI'm interested in OS Kernels, Developing CLI Tools, and Web Development.\nI also like playing city-building games.");
        add_file(profile_txt, "/root/");
    }

    // 入力完了時の動作
    shell.addEventListener('keydown', on_key_press);

    // シェルの初期化
    fd_buffers[shell_fd] = new FileDescriptor(DEST_SHELL);

    // 起動時の表示
    printfd("ysh ver.1.0\n");
    printfd("(c) yotio 2022-2025 All rights reserved.\n\n");
    printfd("To see the list of commands, type 'help'.\n");
}

function newfd(dest) {
    var fd = new FileDescriptor(dest);
    fd_buffers.push(fd);
    return fd.fd_number;
}

function switchfd(shell_index) {
    if (fd_buffers[current_fd].output_file != "") {
        output_file(current_fd);
    }
    current_fd = shell_index;
    if (fd_buffers[current_fd].dest == DEST_SHELL) {
        updateshell();
    }
}

function printfd(str) {
    fd_buffers[current_fd].fd_buffer += str;
    if (fd_buffers[current_fd].dest == DEST_SHELL) {
        updateshell();
    }
}

function updateshell() {
    var shell = document.getElementById('shell_input');
    shell.value = fd_buffers[current_fd].fd_buffer;
    shell.scrollTop = shell.scrollHeight;
}

function shellclear() {
    fd_buffers[current_fd].fd_buffer = "";
    if (fd_buffers[current_fd].dest == DEST_SHELL) {
        updateshell();
    }
}

function add_file(file, dir) {
    console.log("add_file: " + file.name + " to " + dir);
    dirs[dir].push(file);
    //save_to_localstorage();
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
    // edit mode
    else if (shell_mode == MODE_EDIT && e.key == 's' && e.ctrlKey) {
        e.preventDefault();
        // エディタのヘッダ部分を削除
        fd_buffers[current_fd].fd_buffer = fd_buffers[current_fd].fd_buffer.split(EDITOR_HEADER[0]).join("");
        fd_buffers[current_fd].fd_buffer = fd_buffers[current_fd].fd_buffer.split(EDITOR_HEADER[1]).join("");
        output_file(current_fd);
        switchfd(shell_fd);
        shell_mode = MODE_SHELL;
        waiting();
        return true;
    }
    else if (shell_mode == MODE_EDIT && e.key == 'c' && e.ctrlKey) {
        e.preventDefault();
        fd_buffers[current_fd].output_file = "";
        switchfd(shell_fd);
        shell_mode = MODE_SHELL;
        waiting();
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
    if (fd_buffers[current_fd].dest == DEST_SHELL) {
        updateshell();
    }
    // コマンド実行
    if (shell_mode == MODE_SHELL) {
        parse_and_run(last_line);
    }

    //if (ret == 1) {
    //    printfd("command returns an error.\n");
    //}

    // 次の入力へ
    if (shell_mode == MODE_SHELL) {
        switchfd(shell_fd);
        waiting();
    }
}

function parse_and_run(str) {
    // '>' を含む場合は fd を生成・変更
    if (str.includes(">")) {
        var fd_num = newfd(DEST_FILE);
        var output_file_name = str.split(">")[1].trim();
        var output_file_path = parse_path(output_file_name, TYPE_FILE);
        fd_buffers[fd_num].output_file = output_file_path;
        switchfd(fd_num);
        str = str.split(">")[0];
    }

    // パース
    args = str.split(" ");

    // 実行
    if (args[0] in func_obj) {
        var ret = func_obj[args[0]]();
        return ret;
    }
    printfd("command not found: " + args[0] + '\n');
    return 1;
}

function get_arg(num) {
    if (num >= args.length) {
        return null;
    }
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
    var output_file_path = fd_buffers[fd_num].output_file;
    if (file_exists(output_file_path)) {
        var file = get_file(output_file_path);
        file.set_content(fd_buffers[fd_num].fd_buffer);
    }
    else {
        var file_object = new FileSystemObject(get_last_dir(output_file_path), output_file_path, TYPE_FILE);
        file_object.set_content(fd_buffers[fd_num].fd_buffer);
        add_file(file_object, get_parent_dir(output_file_path));
    }
}

// ファイルが存在するか確認
function file_exists(path) {
    var full_path = parse_path(path, TYPE_FILE);
    var parent_dir = get_parent_dir(full_path);
    var file_name = get_last_dir(full_path);
    if (dirs[parent_dir] == undefined) {
        return false;
    }
    for (var i=0; i<dirs[parent_dir].length; i++) {
        if (dirs[parent_dir][i].name == file_name) {
            return true;
        }
    }
    return false;
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

// ブラウザの LocalStorage に保存
function save_to_localstorage() {
    var json_dirs = JSON.stringify(dirs);
    console.log(json_dirs);
    localStorage.setItem("dirs", json_dirs);

    console.log("save_to_localstorage");
}

// ブラウザの LocalStorage から読み込み
function load_from_localstorage() {
    console.log("load_from_localstorage");

    var json_dirs = localStorage.getItem("dirs");
    if (json_dirs == null) {
        return false;
    }
    dirs = JSON.parse(json_dirs);
    console.log(dirs);
    return true;
}

var func_obj = [];

func_obj["cd"] = function() {
    var names = names_in_dir(current_dir);
    let arg1 = get_arg(1);
    if (arg1 == null) {
        printfd("usage: cd [dir]\n");
        return 1;
    }

    if (arg1 in names) {
        // 絶対パス
        current_dir = arg1;
    }
    else {
        // 相対パス
        var path = parse_path(arg1, TYPE_DIR);
        for (let key in dirs) {
            if (key == path) {
                current_dir = path;
                return 0;
            }
        }
    }
    printfd(arg1 + " not found.\n");
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
        var arg1 = get_arg(1);
        if (arg1 == null) {
            printfd("usage: ls [dir]\n");
            return 1;
        }
        path = parse_path(arg1, TYPE_DIR);
    }
    var fullpaths = fullpath_in_dir(path);
    for (var i=0; i<fullpaths.length; i++) {
        printfd(fullpaths[i] + "\n");
    }
    return 0;
}

func_obj["mkdir"] = function() {
    // '/' が含まれている場合はパスを解決
    var path = get_arg(1);
    if (path == null) {
        printfd("usage: mkdir [dir]\n");
        return 1;
    }
    if (path.includes("/")) {
        var parent_dir = get_parent_dir(path);
        var dir_name = get_last_dir(path);
        dirs[parent_dir + dir_name + "/"] = [];
        var new_dir = new FileSystemObject(dir_name, parent_dir + dir_name + "/", TYPE_DIR);
        add_file(new_dir, parent_dir);
        return 0;
    }
    // それ以外はカレントディレクトリに作成
    dirs[current_dir + path + "/"] = [];
    var new_dir = new FileSystemObject(path, current_dir + path + "/", TYPE_DIR);
    add_file(new_dir, current_dir);
    return 0;
}

func_obj["pwd"] = function() {
    printfd(current_dir + "\n");
    return 0;
}

func_obj["cat"] = function() {
    var filepath= get_arg(1);
    if (filepath == null) {
        printfd("usage: cat [file]\n");
        return 1;
    }
    var file = get_file(filepath);
    if (file != null) {
        printfd(file.content + "\n");
        return 0;
    }
    printfd(filepath + " not found.\n");
    return 1;
}

func_obj["edit"] = function() {
    var filepath= get_arg(1);
    if (filepath == null) {
        printfd("usage: edit [file]\n");
        return 1;
    }
    var file = get_file(filepath);
    shell_mode = MODE_EDIT;

    if (file != null && file.type != TYPE_FILE) {
        printfd(full_path + " is not a file.\n");
        return 1;
    }

    var fd = newfd(DEST_SHELL);
    switchfd(fd);
    if (file != null) {
        fd_buffers[fd].output_file = file.fullpath;
    }
    else {
        var file_fullpath = parse_path(filepath, TYPE_FILE);
        fd_buffers[fd].output_file = file_fullpath;
    }
    for (var i=0; i<EDITOR_HEADER.length; i++) {
        printfd(EDITOR_HEADER[i]);
    }
    if (file != null) {
        printfd(file.content);
    }
    
    return 0;
}
