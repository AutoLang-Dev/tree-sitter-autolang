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
    [$._fn_def, $._pat_ident],
  ],

  externals: $ => [$.llvm_ir],

  rules: {
    trans_unit: $ => repeat($._decl_stmt),

    decl_stmt: $ => $._decl_stmt,
    _decl_stmt: $ => choice(
      prec(1, $.asm_block),
      $.fn_def,
      $.binding_decl,
    ),

    fn_def: $ => $._fn_def,
    _fn_def: $ => seq(
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
    ),

    fn_sign: $ => $._fn_sign,
    _fn_sign: $ => seq(
      'fn',
      optional(field('paras', $.paras)),
      optional(seq(
        '->',
        field('ret', $.type),
      )),
    ),

    paras: $ => $._paras,
    _paras: $ => seq(
      '(',
      sepBy(',', $.para),
      ')',
    ),

    para: $ => $._para,
    _para: $ => seq(
      field('pat', $.pat_ident),
      optional(seq(
        ':',
        field('ty', $._type),
      ))
    ),

    fn_body: $ => $._fn_body,
    _fn_body: $ => choice(
      prec(1, $.block),
      $.asm_block,
      $._expr_stmt,
    ),

    binding_decl: $ => $._binding_decl,
    _binding_decl: $ => choice(
      $._typed_binding_decl,
      $._auto_binding_decl,
    ),

    typed_binding_decl: $ => $._typed_binding_decl,
    _typed_binding_decl: $ => seq(
      field('pat', $._pattern),
      ':',
      field('type', $._type),
      optional(seq(
        '=',
        field('value', $._expr),
      )),
      ';',
    ),

    auto_binding_decl: $ => $._auto_binding_decl,
    _auto_binding_decl: $ => seq(
      field('pat', $._pattern),
      ':',
      '=',
      field('value', $._expr),
      ';',
    ),

    type: $ => $._type,
    _type: $ => choice(
      $.ident,
      $.type_infer,
    ),

    type_infer: $ => $._type_infer,
    _type_infer: $ => $.underscore,

    pattern: $ => $._pattern,
    _pattern: $ => choice(
      $.pat_wild,
      $.pat_ident,
    ),

    pat_wild: $ => $._pat_wild,
    _pat_wild: $ => $._underscore,

    pat_ident: $ => $._pat_ident,
    _pat_ident: $ => seq(
      optional('mut'),
      field('ident', $.ident),
    ),

    pat_type: $ => $._pat_type,
    _pat_type: $ => seq(
      field('pat', $.pat_ident),
      ':',
      field('ty', $._type),
    ),

    stmt: $ => $._stmt,
    _stmt: $ => choice(
      $.asm_block,
      $.expr_stmt,
      $._decl_stmt,
    ),

    asm_block: $ => $._asm_block,
    _asm_block: $ => seq(
      'asm',
      '{',
      field('inner', $.llvm_ir),
      '}',
    ),

    expr_stmt: $ => $._expr_stmt,
    _expr_stmt: $ => choice(
      seq($._expr, ';'),
      prec(1, $._expr_ending_with_block),
    ),

    expr: $ => $._expr,
    _expr: $ => choice(
      $.ident,
      $.assign_expr,
      $.call_expr,
      $.paren_expr,
      $.as_expr,
      $._expr_ending_with_block,
    ),

    assign_expr: $ => $._assign_expr,
    _assign_expr: $ => prec.left(PREC.assign, seq(
      field('lhs', $._expr),
      '=',
      field('rhs', $._expr),
    )),

    call_expr: $ => prec(PREC.call, seq(
      field('fn', $._expr),
      field('args', $.args),
    )),

    args: $ => $._args,
    _args: $ => seq(
      '(',
      sepBy(',', $._expr),
      optional(','),
      ')',
    ),

    paren_expr: $ => $._paren_expr,
    _paren_expr: $ => seq(
      '(',
      $._expr,
      ')',
    ),

    as_expr: $ => $._as_expr,
    _as_expr: $ => prec.left(PREC.as, seq(
      field('value', $._expr),
      'as',
      field('type', $._type),
    )),

    expr_ending_with_block: $ => $._expr_ending_with_block,
    _expr_ending_with_block: $ => choice(
      $.labelled,
      $.block,
      $.if_expr,
      $.while_expr,
      $.for_expr,
    ),

    if_expr: $ => $._if_expr,
    _if_expr: $ => seq(
      'if',
      field('cond', $._expr),
      field('tru', $.block),
      optional(field('fls', $._else_clause)),
    ),

    else_clause: $ => $._else_clause,
    _else_clause: $ => seq(
      'else',
      choice(
        $.block,
        $.if_expr,
      ),
    ),

    while_expr: $ => $._while_expr,
    _while_expr: $ => seq(
      'while',
      field('cond', $._expr),
      field('body', $.block),
      optional(field('else', $._loop_else_clause)),
    ),

    for_expr: $ => $._for_expr,
    _for_expr: $ => seq(
      'for',
      field('pat', $._pattern),
      'in',
      field('value', $._expr),
      field('body', $.block),
      optional(field('else', $._loop_else_clause)),
    ),

    loop_else_clause: $ => $._loop_else_clause,
    _loop_else_clause: $ => seq(
      'else',
      $.block,
    ),

    labelled: $ => $._labelled,
    _labelled: $ => seq(
      field('label', $.label),
      ':',
      field('block', choice(
        $.block,
        $.while_expr,
        $.for_expr,
      )),
    ),

    block: $ => $._block,
    _block: $ => seq(
      '{',
      repeat($._stmt),
      optional($._expr),
      '}',
    ),

    label: $ => $._label,
    _label: _ => seq("'", token.immediate(IdentRegex)),

    underscore: $ => $._underscore,
    _underscore: _ => '_',

    ident: $ => $._ident,
    _ident: _ => IdentRegex,
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
