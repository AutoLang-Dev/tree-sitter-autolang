/**
 * @file AutoLang Parser
 * @author AutoLang-Dev <contact@autolang.dev>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const IdentRegex = /[_\p{XID_Start}][\p{XID_Continue}]*/u;

const PREC = {
  call: 15,
  as: 11,
  assign: 0,
  semi: -1,
}

module.exports = grammar({
  name: 'autolang',

  conflicts: $ => [
  ],

  externals: $ => [$.llvm_ir],

  reserved: {
    global: _ => [
      'fn',
      'mut',
      'asm',
      'as',
      'if',
      'else',
      'while',
      'for',
      'in',
      'return',
      'break',
      'cont',
    ],
  },

  word: $ => $.ident,

  supertypes: $ => [
    $._expr,
    $._pattern,
    $._type,
  ],

  rules: {
    trans_unit: $ => listSepBy(';', $._expr),

    _expr: $ => choice(
      $.ident,
      $.semi_expr,
      $.assign_expr,
      $.call_expr,
      $.paren_expr,
      $.as_expr,
      $.return_expr,
      $.break_expr,
      $.cont_expr,
      $.labeled,
      $.block,
      $.if_expr,
      $.while_expr,
      $.for_expr,
      $.asm_block,
      $._decl,
    ),

    _decl: $ => choice(
      $.fn_def,
      $.binding,
    ),

    fn_def: $ => prec.right(seq(
      field('name', $._pattern),
      ':',
      field('sign', $.fn_sign),
      optional(seq(
        '=',
        field('body', $._expr),
      )),
    )),

    fn_sign: $ => prec.right(seq(
      'fn',
      optional(field('paras', $.paras)),
      optional(seq(
        '->',
        field('ret', $._type),
      )),
    )),

    paras: $ => seq(
      '(',
      sepBy(',', $.para),
      ')',
    ),

    para: $ => seq(
      field('pat', $.pat_ident),
      optional(seq(
        ':',
        field('ty', $._type),
      ))
    ),

    binding: $ => prec.right(seq(
      field('pat', $._pattern),
      ':',
      field('ty', optional($._type)),
      '=',
      field('init', choice(
        $._expr,
        $.underscore,
      )),
    )),

    _type: $ => choice(
      $.ident,
      $.underscore,
    ),

    _pattern: $ => choice(
      $.underscore,
      $.pat_ident,
    ),

    pat_ident: $ => seq(
      optional('mut'),
      field('id', $.ident),
    ),

    pat_type: $ => seq(
      field('pat', $.pat_ident),
      ':',
      field('ty', $._type),
    ),

    asm_block: $ => seq(
      'asm',
      '{',
      field('inner', $.llvm_ir),
      '}',
    ),

    semi_expr: $ => prec.left(PREC.semi, seq(
      field('lhs', $._expr),
      ';',
      field('rhs', optional($._expr)),
    )),

    assign_expr: $ => prec.right(PREC.assign, seq(
      field('lhs', $._expr),
      '=',
      field('rhs', $._expr),
    )),

    call_expr: $ => prec(PREC.call, seq(
      field('fn', $._expr),
      field('args', $.args),
    )),

    args: $ => seq(
      '(',
      sepBy(',', $._expr),
      optional(','),
      ')',
    ),

    paren_expr: $ => seq(
      '(',
      $._expr,
      ')',
    ),

    as_expr: $ => prec(PREC.as, seq(
      field('val', $._expr),
      'as',
      field('ty', $._type),
    )),

    return_expr: $ => prec.right(choice(
      seq('return', $._expr),
      'return',
    )),

    break_expr: $ => prec.right(seq(
      'break',
      field('lab', optional($.label)),
      field('val', $._expr),
    )),

    cont_expr: $ => seq(
      'cont',
      field('lab', optional($.label)),
    ),

    if_expr: $ => seq(
      'if',
      field('cond', $._expr),
      field('body', $.block),
      optional(field('el', $._else_clause)),
    ),

    _else_clause: $ => seq(
      'else',
      choice(
        $.block,
        $.if_expr,
      ),
    ),

    while_expr: $ => seq(
      'while',
      field('cond', $._expr),
      field('body', $.block),
      optional(field('el', $._loop_else_clause)),
    ),

    for_expr: $ => seq(
      'for',
      field('pat', $._pattern),
      'in',
      field('range', $._expr),
      field('body', $.block),
      optional(field('el', $._loop_else_clause)),
    ),

    _loop_else_clause: $ => seq(
      'else',
      $.block,
    ),

    labeled: $ => seq(
      field('lab', $.label),
      ':',
      field('block', choice(
        $.block,
        $.while_expr,
        $.for_expr,
      )),
    ),

    block: $ => seq(
      '{',
      optional($._expr),
      '}',
    ),

    label: _ => token(seq("'", token.immediate(IdentRegex))),

    underscore: _ => '_',

    ident: _ => token(IdentRegex),
  },
});

/**
 * @param {RuleOrLiteral} sep
 * @param {RuleOrLiteral} rule
 */
function sepBy1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)));
}

/**
 * @param {RuleOrLiteral} sep
 * @param {RuleOrLiteral} rule
 */
function sepBy(sep, rule) {
  return optional(sepBy1(sep, rule));
}

/**
 * @param {RuleOrLiteral} sep
 * @param {RuleOrLiteral} rule
 */
function listSepBy1(sep, rule) {
  return seq(
    sepBy1(sep, rule),
    optional(sep),
  );
}

/**
 * @param {RuleOrLiteral} sep
 * @param {RuleOrLiteral} rule
 */
function listSepBy(sep, rule) {
  return seq(
    repeat(seq(
      rule,
      sep,
    )),
    optional(rule),
  );
}
