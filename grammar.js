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

    decl_stmt: $ => $._decl_stmt,
    _decl_stmt: $ => choice(
      $.fn_def,
      $.binding,
    ),

    fn_def: $ => $._fn_def,
    _fn_def: $ => prec(1, seq(
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

    fn_sign: $ => $._fn_sign,
    _fn_sign: $ => seq(
      'fn',
      optional(field('paras', $.paras)),
      optional(seq(
        '->',
        field('ret', $._type),
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

    binding: $ => $._binding,
    _binding: $ => choice(
      $._typed_binding,
      $._auto_binding,
    ),

    typed_binding: $ => $._typed_binding,
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

    auto_binding: $ => $._auto_binding,
    _auto_binding: $ => seq(
      field('pat', $._pattern),
      ':',
      '=',
      field('val', $._expr),
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
      field('id', $.ident),
    ),

    pat_type: $ => $._pat_type,
    _pat_type: $ => seq(
      field('pat', $.pat_ident),
      ':',
      field('ty', $._type),
    ),

    stmt: $ => $._stmt,
    _stmt: $ => choice(
      $.expr_stmt,
      $._expr_ending_with_block,
      $._global_stmt,
    ),

    empty_stmt: $ => $._empty_stmt,
    _empty_stmt: _ => ';',

    asm_block: $ => $._asm_block,
    _asm_block: $ => seq(
      'asm',
      '{',
      field('inner', $.llvm_ir),
      '}',
    ),

    expr_stmt: $ => $._expr_stmt,
    _expr_stmt: $ => seq($._expr, ';'),

    expr: $ => $._expr,
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
      field('val', $._expr),
      'as',
      field('ty', $._type),
    )),

    break_expr: $ => $._break_expr,
    _break_expr: $ => prec.left(seq(
      'break',
      field('lab', optional($.label)),
      field('val', $._expr),
    )),

    cont_expr: $ => $._cont_expr,
    _cont_expr: $ => prec.left(seq(
      'cont',
      field('lab', optional($.label)),
    )),

    expr_ending_with_block: $ => $._expr_ending_with_block,
    _expr_ending_with_block: $ => choice(
      $.labeled,
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
      optional(field('el', $._loop_else_clause)),
    ),

    for_expr: $ => $._for_expr,
    _for_expr: $ => seq(
      'for',
      field('pat', $._pattern),
      'in',
      field('range', $._expr),
      field('body', $.block),
      optional(field('el', $._loop_else_clause)),
    ),

    loop_else_clause: $ => $._loop_else_clause,
    _loop_else_clause: $ => seq(
      'else',
      $.block,
    ),

    labeled: $ => $._labeled,
    _labeled: $ => seq(
      field('lab', $.label),
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

    label: _ => token(seq("'", token.immediate(IdentRegex))),

    underscore: $ => $._underscore,
    _underscore: _ => '_',

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
