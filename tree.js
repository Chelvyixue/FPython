function printTree(root, indent) {
    if (!root) return;
    for (var i = 0; i < indent; i++) {
        document.getElementById("tree").innerHTML += ".&nbsp";
    }
    var n = root.getChildCount();
    if (n == 0) {
        document.getElementById("tree").innerHTML += "<span class=\"leaf\">" + root + "</span><br />";
    }
    else {
        document.getElementById("tree").innerHTML += root + "<br />";
    }
    for (i = 0; i < n; i++) {
        printTree(root.getChild(i), indent + 1);
    }
}

function parseTree(root, env) {
    if (!root) return;
    var n = root.getChildCount();
    if (n == 0) { // Leaf node
    }
    else {
        var ruleIndex = root.ruleIndex;
        switch (ruleIndex) {
            case 83:    // integer
                return new Data(Data.t_integer, parseInt(root.getChild(0).symbol.text));
            case 82:    // number
                var child = root.getChild(0);
                if (child.getChildCount() == 0)    // float
                    return new Data(Data.t_float, parseFloat(child.symbol.text))
                else
                    return parseTree(root.getChild(0), env);
            case 81:    // string
                var text = root.getChild(0).symbol.text;
                text = text.substring(1, text.length-1);
                return new Data(Data.t_string, text);
                break;
            case 75:    // argument no comp_for
                if (n == 1) {
                    return parseTree(root.getChild(0), env);
                }
                else if (n == 3) {    // assignment
                    var leftNode = root.getChild(0);
                    var name = getVariableName(leftNode);
                    var data = parseTree(root.getChild(2), env);
                    env.bind(name, data);
                }
                break;
            case 74:    // arglist no star
                var res = new Array();
                for (var i = 0; i < n; i += 2) {
                    var elem = parseTree(root.getChild(i), env);
                    res.push(elem);
                }
                return new Data(Data.t_arglist, res);
            case 71:    // testlist
            case 65:    // testlist_comp no comp_for
                var res = new Array();
                for (var i = 0; i < n; i += 2) {
                    var elem = parseTree(root.getChild(i), env);
                    res.push(elem);
                }
                return new Data(Data.t_array, res);
                break;
            case 70:    // exprlist 只处理了只有一个star_expr的情况
                var star_exprNode = root.getChild(0);
                var star_exprRes = parseTree(star_exprNode, env);
                return star_exprRes;
            case 68:
                if (n == 1) {
                    return parseTree(root.getChild(0), env);
                }
                else {
                    alert("Slicing is not implemented");
                }
            case 67:    // subscriptlist
                if (n == 1) {
                    return parseTree(root.getChild(0), env);
                }
                else {
                    alert("Only one subscript allowed");
                }
            case 66:    // trailer
                var child0 = root.getChild(0);
                var ch = child0.symbol.text;
                switch (ch) {
                    case '(':
                        if (n > 2) {
                            return parseTree(root.getChild(1), env);    // arglist
                        }
                        else {
                            return new Data(Data.t_arglist, new Array());    // no args, empty list
                        }
                        break;
                    case '[':
                        var subscript = parseTree(root.getChild(1), env);
                        if (subscript.type == Data.t_integer) {
                            return new Data(Data.t_sub, subscript);    // subscriptlist
                        }
                        else {
                            alert("Subscript format error: ", subscript.val);
                        }
                        break;
                    case '.':
                        return parseTree(root.getChild(1), env);
                        break;
                }
                break;
            case 64:    // atom
                if (n == 1) {    // NAME, number, string, NONE, TRUE, FALSE
                    var child = root.getChild(0);
                    var childN = child.getChildCount();
                    if (childN == 0) {    // child is a leaf, NAME, NONE, TRUE, FALSE
                        var literal = child.symbol.text;
                        switch (literal) {
                            case "True": return new Data(Data.t_bool, true); break;
                            case "False": return new Data(Data.t_bool, false); break;
                            case "None": return new Data(Data.t_bool, null); break;
                            case "print": return new Data(Data.t_print, null); break;
                            default:
                                return env.eval(literal);
                        }
                    }
                    else {
                        return parseTree(child, env);
                    }
                }
                else {    // list, tuple, dict, yield
                    switch (root.getChild(0).symbol.text) {
                        case '[':
                            var list = [];
                            var child = root.getChild(1);
                            var childN = child.getChildCount();
                            for (var i = 0; i < childN; i += 2) {
                                list.push(parseTree(child.getChild(i), env));
                            }
                            return new Data(Data.t_array, list);
                        case '(':
                            var resArray = parseTree(root.getChild(1), env);
                            return resArray.val[0];
                        case '{': break;
                        default: alert("Unknown list bracer")
                    }
                }
            case 63:    // power
                if (n == 1) {   // power: atom
                    return parseTree(root.getChild(0), env);
                }
                else if (n == 2) {    // power: atom trailer
                    // function call
                    var atom = parseTree(root.getChild(0), env);
                    var trailer = parseTree(root.getChild(1), env);
                    return evalTrailer(atom, trailer, env);
                }
                else if (n == 3) {    // power: atom ** factor
                    var atom = parseTree(root.getChild(0), env);
                    var factor = parseTree(root.getChild(1), env);
                    var power = calcPower(atom, factor);
                    return new Data(Data.t_integer, power);
                }
                else if (n == 4) {    // power: atom trailer ** factor
                    var atom = parseTree(root.getChild(0), env);
                    var trailer = parseTree(root.getChild(1), env);
                    var factor = parseTree(root.getChild(3), env);
                    var evaled = evalTrailer(atom, trailer, env);
                    var power = calcPower(value, factor);
                    return new Data(Data.t_integer, power);
                }
                else {
                    alert("power arg n");
                }
                break;
            case 62:    // factor
                if (n == 1) {    // factor: power
                    return parseTree(root.getChild(0), env);
                }
                else if (n == 2) {    // factor: (+|-|~) factor
                    var sign = root.getChild(0).symbol.text;
                    var val = parseTree(root.getChild(1), env);
                    return signFactor(sign, val);
                }
                else {
                    alert("factor arg n");
                }
                break;
            case 54:    // star
                return parseTree(root.getChild(0), env);
            case 61:    // term
            case 60:    // arith
            case 59:    // shift
            case 58:    // and
            case 57:    // xor
            case 56:    // expr
            case 51:    // and_test
            case 50:    // or_test
                if (n == 1) {    // parent: child
                    return parseTree(root.getChild(0), env);
                }
                else if (n == 3) {    // parent: child op child
                    var val1 = parseTree(root.getChild(0), env);
                    var val2 = parseTree(root.getChild(2), env);
                    var operator = root.getChild(1).symbol.text;
                    return calc(val1, val2, operator);
                }
                else if (n > 3) {
                    // left associative
                    var val1 = parseTree(root.getChild(0), env);
                    for (var i = 0; i < n - 2; i += 2) {
                        var val2 = parseTree(root.getChild(i + 2), env);
                        var operator = root.getChild(i + 1).symbol.text;
                        val1 = calc(val1, val2, operator);
                    }
                    return val1;
                }
                break;
            case 55:    //star_expr 直接去掉star
                var exprNode;
                if( n == 2 )
                    exprNode = root.getChild(1);
                else
                    exprNode = root.getChild(0);
                return parseTree(exprNode, env);
            case 53:    // comparison
                if (n == 1) {    // parent: child
                    return parseTree(root.getChild(0), env);
                }
                else if (n == 3) {    // parent: child op child
                    var val1 = parseTree(root.getChild(0), env);
                    var val2 = parseTree(root.getChild(2), env);
                    var operator = root.getChild(1).getChild(0).symbol.text;
                    return comp(val1, val2, operator);
                }
                else {
                    alert("calc arg number error");
                }
                break;
            case 52:    // not test
                if (n == 1) {
                    return parseTree(root.getChild(0), env);
                }
                if (n == 2) {
                    var boolean = parseTree(root.getChild(1), env);
                    if (boolean.type == Data.t_bool)
                        return new Data(Data.t_bool, !boolean.val);
                    else
                        alert("Logic operation on non-bool value");
                }
                break;
            case 46:    // test no if else
                var child0 = root.getChild(0);
                if (child0.ruleIndex == 50) {
                    return parseTree(child0, env);
                }
                if (child0.ruleIndex == 48) {
                    return parseTree(child0, env);
                }
                break;
            case 45:   //suite
                if( n == 1 ) return parseTree(root.getChild(0), env);
                else {
                    for(var i=2; i<n-1; i++) {
                        var ret = parseTree(root.getChild(i), env);
                        if (ret.type == Data.t_return)
                            return ret;
                    }
                    return new Data(Data.t_null, 0);
                }
			case 40:     //for_stmt
				var exprlistNode = root.getChild(1);
				var testlistNode = root.getChild(3);
				var suiteNode = root.getChild(5);
				
				var exprlistRes = getVariableName(exprlistNode);
				var testlistRes = parseTree(testlistNode, env);
                var list = testlistRes.val[0].val;
				for(var i = 0 ; i < list.length; i += 2)
				{
                    var childEnv = new Env(env);
                    childEnv.bind(exprlistRes, list[i]);
					parseTree(suiteNode, childEnv);
				}
				return new Data(Data.t_null,0);
            case 38:    // if_stmt
                // if_stmt: IF test : suite (ELIF test : suite)* [ELSE : suite]
                // If it has an ELSE clause, the number of its children must be odd, vice versa
                for (var i = 0; i < n; i += 4) {
                    var testRes = parseTree(root.getChild(i + 1), env);
                    if (getBoolean(testRes) == true) {
                        return parseTree(root.getChild(i + 3), env);
                    }
                }
                if (i == n + 1) {    // has an ELSE clause
                    return parseTree(root.getChild(n - 1), env);
                }
                return new Data(Data.t_null, 0);
                break;
            case 37:    // compound_stmt
                return parseTree(root.getChild(0), env);
                break;
            case 23:    // return_stmt
                if (n == 1) {    // no return value
                    return new Data(Data.t_return, new Data(Data.t_bool, null));
                }
                else {    // one return value
                    var returnVal = parseTree(root.getChild(1), env);
                    return new Data(Data.t_return, returnVal.val[0]);
                }
            case 20:    // flow_stmt
                return parseTree(root.getChild(0), env);
            case 16:    // testlist_star_expr no star_expr
                if (n == 1) {
                    return parseTree(root.getChild(0), env);
                }
                else {
                    var res = new Array();
                    for (var i = 0; i<root.getChildCount(); i+=2) {
                        res.push(parseTree(root.getChild(i)), env);
                    }
                    return new Data(Data.t_array, res);
                }
                break;
            case 15:    // expr_stmt
                if (n == 1) {    // trival case
                    return parseTree(root.getChild(0), env);
                }
                var testlist_star_exprNode = root.getChild(0);
                var testlist_star_exprRes = getVariableName(testlist_star_exprNode);
                for(var i=1; i<2;i++)
                {
                    var node = root.getChild(i);
                    var res;
                    if( node.ruleIndex == 17 ) // augassign
                    {
                        var augassignRes = parseTree(node, env);
                        var testlistRes = parseTree(root.getChild(i+1), env);
                        //=====这里有问题 需要修改
                        switch(augassignRes)
                        {
                            case "+=":hashVar[testlist_star_exprRes]+=testlistRes.val;break;
                            case "-=":hashVar[testlist_star_exprRes]-=testlistRes.val;break;
                            case "*=":hashVar[testlist_star_exprRes]*=testlistRes.val;break;
                            case "/=":hashVar[testlist_star_exprRes]/=testlistRes.val;break;
                            case "%=":hashVar[testlist_star_exprRes]%=testlistRes.val;break;
                            case "&=":hashVar[testlist_star_exprRes]&=testlistRes.val;break;
                            case "|=":hashVar[testlist_star_exprRes]|=testlistRes.val;break;
                            case "^=":hashVar[testlist_star_exprRes]^=testlistRes.val;break;
                            case "<<=":hashVar[testlist_star_exprRes]<<=testlistRes.val;break;
                            case ">>=":hashVar[testlist_star_exprRes]>>=testlistRes.val;break;
                        }
                        i+=2;
                    } else {
                        res = parseTree(root.getChild(i+1), env);
                        env.bind(testlist_star_exprRes, res);
                    }
                }
                return env.eval(testlist_star_exprRes);
            case 14:    //small_stmt
                return parseTree(root.getChild(0), env);
            case 13:    //simple_stmt
                for(var i=0; i < n; i+=2) {
                    var ret = parseTree(root.getChild(i), env);
                    if (ret.type == Data.t_return) {
                        return ret;
                    }
                }
                return new Data(Data.t_null,0);
            case 12:    // stmt
                return parseTree(root.getChild(0), env);
                break;
            case 9:    // tfpdef
                break;
            case 8:    // typedargslist
                // only implemented non-default params
                var res = new Array();
                for (var i = 0; i < n; i += 2) {
                    res.push(root.getChild(i).getChild(0).symbol.text);
                }
                return new Data(Data.t_argnames, res);
            case 7:    // parameters
                if (n == 3)
                    return parseTree(root.getChild(1), env);
                else if (n == 2)
                    return new Data(Data.t_argnames, new Array())
                break;
            case 6:    // funcdef
                if (n == 5) {    // DEF NAME params : suite
                    var funcName = getVariableName(root.getChild(1));
                    var params = parseTree(root.getChild(2), env);
                    var code = root.getChild(4);
                    env.bind(funcName, new Data(Data.t_func, new FuncDef(params, code)));
                    return new Data(Data.t_null, 0);
                }
                break;
            case 1:    // file_input
                for (var i = 0; i < n; i++) {
                    var child = root.getChild(i);
                    if (child.getChildCount() != 0)    {    // s, not "\n" or <EOF>
                        parseTree(child, env);
                    }
                }
                break;
            default:
                alert("Unknown rule: " + ruleIndex);
        }
    }
}

function funcCall(funcData, arglist, env) {
    // funcData: Data(Data.t_func, Funcdef(param, code))
    // arglist: Data(Data.t_arglist, [args]);
    var childEnv = new Env(env);
    var argnames = funcData.val.params.val;
    var code = funcData.val.code;
    arglist = arglist.val;
    for (var i = 0; i < argnames.length; i++) {
        childEnv.bind(argnames[i], arglist[i]);
    }
    var ret = parseTree(code, childEnv);
    return ret.val;
}

function callPrint(arglist) {
    function getString(data, strInArray) {
        switch (data.type) {
            case Data.t_array:
                var list = data.val;
                var res = []
                for (var i = 0; i < list.length; i++)
                    res.push(getString(list[i], true));
                res = res.join(', ');
                res = "[" + res + "]";
                return res;
            case Data.t_arglist:
                var list = data.val;
                var res = []
                for (var i = 0; i < list.length; i++)
                    res.push(getString(list[i], false));
                res = res.join(' ');
                return res;
            case Data.t_bool:
                switch (data.val) {
                    case true: return "True";
                    case false: return "False";
                    case null: return "None";
                    default: alert("boolean value error");
                }
            case Data.t_string:
                if (strInArray)
                    return "\'" + data.val + "\'";
                else 
                    return data.val;
            default:
                return "" + data.val;
        }
    }
    document.getElementById("outputs").innerHTML += getString(arglist, false) + "\n"
}

function getBoolean(data) {
    if (!data)
        return false
    switch (data.type) {
        case Data.t_bool:
            return data.val == true;
        case Data.t_integer:
            return data.val != 0;
        case Data.t_string:
            return !!data.val;
        case Data.t_array:
            return data.val.length != 0;
        default:
            alert("Cannot get boolean value");
    }
}

function getVariableName(node) {
    var n = node.getChildCount();
    var child = node;
    while (n > 0) {    // 不考虑 a[3] = 4 这样的赋值语句 trailer处理
        child = node.getChild(0);
        node = child;
        n = child.getChildCount();
    }
    // now child is a leaf node\
    return child.symbol.text;
}

function evalTrailer(atom, trailer, env) {
    if (atom.type == Data.t_print) {    // print
        if (trailer.type == Data.t_arglist) {
            callPrint(trailer);
            return new Data(Data.t_null, 0);
        }
    }

    if (atom) {
        if (atom.type == Data.t_func) {    // function
            if (trailer.type == Data.t_arglist) {
                return funcCall(atom, trailer, env);
            }
            else {
                alert("Atom has not implemented [] or .");
            }
        }
        else if (atom.type == Data.t_array) {    // array
            if (trailer.type == Data.t_sub) {
                var list = atom.val;
                var sub = trailer.val.val;
                if (sub >= 0 && sub < list.length) {
                    return list[sub];
                }
                else {
                    alert("Subscript out of index");
                }
            }
            else {
                alert("Atom has not implemented () or .");
            }
        }
        else if (atom.type == Data.t_object) {    // object
        }
    }
    else {
        alert("Undefined atom name");
    }
}

function calc(val1, val2, operator) {
    if (val1.type == Data.t_integer && val2.type == Data.t_integer) {
        switch (operator) {
            case "&": res = val1.val & val2.val; break;
            case "^": res = val1.val ^ val2.val; break;
            case "|": res = val1.val | val2.val; break;
            case ">>": res = val1.val >> val2.val; break;
            case "<<": res = val1.val << val2.val; break;
            case "+": res = val1.val + val2.val; break;
            case "-": res = val1.val - val2.val; break;
            case "*": res = val1.val * val2.val; break;
            case "/": alert("Unimplemented division"); break;
            case "//": res = Math.floor(val1.val / val2.val); break;
            case "%": res = val1.val % val2.val; break;
            default: alert("Unknown arithmetic operator");
        }
        return new Data(Data.t_integer, res);
    }
    else if (val1.type == Data.t_bool && val2.type == Data.t_bool) {
        switch (operator) {
            case "and": res = val1.val && val2.val; break;
            case "or": res = val1.val || val2.val; break;
            default: alert("Unknown logic operator");
        }
        return new Data(Data.t_bool, res);
    }
    else if (val1.type == Data.t_string && val2.type == Data.t_string) {
        if (operator == "+") {
            return new Data(Data.t_string, val1.val + val2.val);
        }
        else {
            alert("Cannot do " + operator + "on a string");
        }
    }
    else if (val1.type == Data.t_array && val2.type == Data.t_array) {
        if (operator == "+") {
            return new Data(Data.t_array, val1.val.concat(val2.val))
        }
        else {
            alert("Cannot do " + operator + "on a list");
        }
    }
    else {
        alert("calc type error");
    }
}

function comp(val1, val2, operator) {
    var res;
    if (val1.type == Data.t_integer && val2.type == Data.t_integer) {
        switch (operator) {
            case "<": res = val1.val < val2.val; break;
            case ">": res = val1.val > val2.val; break;
            case "==": res = val1.val == val2.val; break;
            case ">=": res = val1.val >= val2.val; break;
            case "<=": res = val1.val <= val2.val; break;
            case "!=": res = val1.val != val2.val; break;
            default: alert("Unimplemented");
        }
        return new Data(Data.t_bool, res);
    }
    else {
        alert("comp type error");
    }
}

function calcFactor(sign, factor) {
    if (factor.type == Data.t_integer) {
        switch (sign) {
            case "+":
                return new Data(Data.t_integer, factor.value);
            case "-":
                return new Data(Data.t_integer, -(factor.value));
            case "~":
                return new Data(Data.t_integer, ~(factor.value));
            default:
                alert("Unknown factor sign");
        }
    }
    else {
        alert("signFactor type error");
    }
}

function calcPower(atom, trailer) {
    if (atom.type == Data.t_integer && trailer.type == Data.t_integer) {
        var power = Math.pow(atom.val, trailer.val);
        return new Data(Data.t_integer, power)
    }
    else {
        alert("calcPower type error");
    }
}

function Env(parentEnv) {
    this.hashVar = {};
    this.parentEnv = parentEnv;
}

Env.prototype.bind = function(name, data) {
    this.hashVar[name] = data;
};

Env.prototype.eval = function(name) {
    var data = this.hashVar[name];
    if (!data)
        if (!this.parentEnv)
            alert("Symbol not defined: " + name);
        else
            return this.parentEnv.eval(name);
    else
        return data;
};

function FuncDef(params, code) {
    this.params = params;
    this.code = code;
}

function Data(type, val) {
    this.type = type;
    this.val = val;
}

Data.t_integer = 0;
Data.t_string = 1;
Data.t_null = 2;
Data.t_array = 3;
Data.t_error = 4;
Data.t_key = 5;
Data.t_float = 6;

Data.t_bool = 10;
Data.t_func = 11;
Data.t_object = 12;
Data.t_arglist = 13;
Data.t_print = 14;
Data.t_argnames = 15;
Data.t_return = 16;
Data.t_sub = 17;

var antlr4 = require('antlr4/index');
var FPythonLexer = require('FPythonLexer');
var FPythonParser = require('FPythonParser');
document.getElementById("parse").addEventListener("click", function(){
    var input = document.getElementById("code").value;
    document.getElementById("outputs").innerHTML = "";
    input = SolveIndent(input);
    var chars = new antlr4.InputStream(input);
    var lexer = new FPythonLexer.FPythonLexer(chars);
    var tokens  = new antlr4.CommonTokenStream(lexer);
    var parser = new FPythonParser.FPythonParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.file_input();    var env = new Env(null);
    parseTree(tree, env);
});
    
