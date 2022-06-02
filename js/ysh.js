function boot() {
    var shell = document.getElementById('shell_input');

    // 入力完了時の動作
    shell.addEventListener('keyup', on_key_press);

    // 起動時の表示
    printshell("ysh ver.0.1\n");
    printshell("(c) YotioSoft 2022 All rights reserved.\n\n");
}

function printshell(str) {
    var shell = document.getElementById('shell_input');
    shell.value += str;
}

function waiting() {
    var shell = document.getElementById('shell_input');

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
    console.log(str);
    
    try {
        func_obj[str]();
        return true;
    }
    catch {
        return false;
    }
}

var func_obj = [];

func_obj.hello = function() {
    printshell("Hello!\n");
}
