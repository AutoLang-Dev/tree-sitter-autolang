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
      'break',
      'cont',
    ],
  },

  word: $ => $.ident,

  rules: {
    trans_unit: $ => repeat($._global_stmt),

    _global_stmt: $ => choice(
      $.asm_block,
      $._decl_stmt,
      $.empty_stmt,
    ),

    _decl_stmt: $ => choice(
      $.fn_def,
      $.binding,
    ),

    fn_def: $ => prec(1, seq(
      field('name', $.ident),
      ':',
      field('sign', $.fn_sign),
      choice(
        ';',
        seq(
          '=',
          field('body', $._fn_body),
        )
      ),
    )),

    fn_sign: $ => seq(
      'fn',
      optional(field('paras', $.paras)),
      optional(seq(
        '->',
        field('ret', $._type),
      )),
    ),

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

    _fn_body: $ => choice(
      prec(1, $.block),
      $.asm_block,
      $.expr_stmt,
    ),

    binding: $ => choice(
      $._typed_binding,
      $._auto_binding,
    ),

    _typed_binding: $ => seq(
      field('pat', $._pattern),
      ':',
      field('ty', $._type),
      optional(seq(
        '=',
        field('val', $._expr),
      )),
      ';',
    ),

    _auto_binding: $ => seq(
      field('pat', $._pattern),
      ':',
      '=',
      field('val', $._expr),
      ';',
    ),

    _type: $ => choice(
      $.ident,
      $.type_infer,
    ),

    type_infer: $ => $.underscore,

    _pattern: $ => choice(
      $.pat_wild,
      $.pat_ident,
    ),

    pat_wild: $ => $.underscore,

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

    expr_stmt: $ => seq($._expr, ';'),

    _expr: $ => prec(1, choice(
      $.ident,
      $.assign_expr,
      $.call_expr,
      $.paren_expr,
      $.as_expr,
      $.break_expr,
      $.cont_expr,
      $._expr_ending_with_block,
    )),

    assign_expr: $ => prec.left(PREC.assign, seq(
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

    as_expr: $ => prec.left(PREC.as, seq(
      field('val', $._expr),
      'as',
      field('ty', $._type),
    )),

    break_expr: $ => prec.left(seq(
      'break',
      field('lab', optional($.label)),
      field('val', $._expr),
    )),

    cont_expr: $ => prec.left(seq(
      'cont',
      field('lab', optional($.label)),
    )),

    _expr_ending_with_block: $ => choice(
      $.labeled,
      $.block,
      $.if_expr,
      $.while_expr,
      $.for_expr,
    ),

    if_expr: $ => seq(
      'if',
      field('cond', $._expr),
      field('tru', $.block),
      optional(field('fls', $._else_clause)),
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
      repeat($._stmt),
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
