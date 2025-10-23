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
  field: 14,
  as: 11,
  assign: 0,
  semi: -1,
}

module.exports = grammar({
  name: 'autolang',

  conflicts: $ => [
  ],

  externals: $ => [
    $.llvm_ir,
    $.error_sential,
  ],

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
    $.expr,
    $.pattern,
    $._type,
  ],

  rules: {
    trans_unit: $ => listSepBy(';', $._expr),

    expr: $ => choice(
      $._expr,
      $.semi_expr,
    ),

    _expr_or_semi: $ => choice(
      $.semi_expr,
      $._expr,
    ),

    _expr: $ => choice(
      prec(1, $.ident),
      $.assign_expr,
      $.call_expr,
      $.paren_expr,
      $.as_expr,
      $.tuple_expr,
      $.return_expr,
      $.break_expr,
      $.cont_expr,
      $.labeled_block,
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
      field('pat', $._pattern),
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
      $.tuple_type,
    ),

    tuple_type: $ => tuple($._type, false),

    pattern: $ => choice(
      $.pat_type,
      $._pattern,
    ),

    _pattern: $ => seq(
      optional('$'),
      $._pat,
    ),

    _pat: $ => choice(
      $.underscore,
      $.pat_ident,
      $.pat_tuple,
    ),

    pat_ident: $ => seq(
      optional('mut'),
      field('id', $.ident),
    ),

    pat_tuple: $ => seq(
      '(',
      listSepBy(',', $._pattern),
      ')',
    ),

    pat_type: $ => seq(
      field('pat', $._pattern),
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
      field('lhs', $._expr_or_semi),
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
      listSepBy(',', $._expr),
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

    tuple_expr: $ => prec(1, tuple($._expr, true)),

    return_expr: $ => choice(
      $._prefix_return,
      $._suffix_return,
    ),

    _prefix_return: $ => prec.right(seq(
      'return',
      field('val', optional($._expr)),
    )),

    _suffix_return: $ => prec(PREC.field, seq(
      field('val', $._expr),
      '.',
      'return',
    )),

    break_expr: $ => choice(
      $._prefix_break,
      $._suffix_break,
    ),

    _prefix_break: $ => prec.right(seq(
      'break',
      field('lab', optional($.label)),
      field('val', optional($._expr)),
    )),

    _suffix_break: $ => prec(PREC.field, seq(
      field('val', $._expr),
      '.',
      'break',
      field('lab', optional($.label)),
    )),

    cont_expr: $ => seq(
      'cont',
      field('lab', optional($.label)),
    ),

    if_expr: $ => choice(
      $._prefix_if,
      $._suffix_if,
    ),

    _prefix_if: $ => seq(
      'if',
      field('cond', $._expr),
      field('body', $.block),
      optional($._else_clause),
    ),

    _suffix_if: $ => prec(PREC.field, seq(
      field('cond', $._expr),
      '.',
      'if',
      field('body', $.block),
      optional($._else_clause),
    )),

    _else_clause: $ => seq(
      'else',
      field('el', choice(
        $.block,
        alias($._prefix_if, $.if_expr),
      )),
    ),

    while_expr: $ => choice(
      $._prefix_while,
      $._suffix_while,
    ),

    _prefix_while: $ => seq(
      optional(seq(
        field('lab', $.label),
        ':',
      )),
      'while',
      field('cond', $._expr),
      field('body', $.block),
      optional($._loop_else_clause),
    ),

    _suffix_while: $ => prec(PREC.field, seq(
      field('cond', $._expr),
      '.',
      optional(seq(
        field('lab', $.label),
        ':',
      )),
      'while',
      field('body', $.block),
      optional($._loop_else_clause),
    )),

    for_expr: $ => choice(
      $._prefix_for,
      $._suffix_for,
    ),

    _prefix_for: $ => seq(
      optional(seq(
        field('lab', $.label),
        ':',
      )),
      'for',
      field('pat', $._pattern),
      'in',
      field('range', $._expr),
      field('body', $.block),
      optional($._loop_else_clause),
    ),

    _suffix_for: $ => prec(PREC.field, seq(
      field('range', $._expr),
      '.',
      optional(seq(
        field('lab', $.label),
        ':',
      )),
      'for',
      field('pat', $._pattern),
      'in',
      field('body', $.block),
      optional($._loop_else_clause),
    )),

    _loop_else_clause: $ => seq(
      'else',
      field('el', $.block),
    ),

    labeled_block: $ => seq(
      field('lab', $.label),
      ':',
      field('block', $.block),
    ),

    block: $ => seq(
      '{',
      optional($._expr_or_semi),
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

/**
 * @param {RuleOrLiteral} rule
 * @param {boolean} tail_sep
 */
function tuple(rule, tail_sep) {
  if (tail_sep) {
    return seq(
      '(',
      optional(seq(
        repeat1(seq(
          rule,
          ',',
        )),
        optional(rule),
      )),
      ')',
    );
  } else {
    return seq(
      '(',
      listSepBy(',', rule),
      ')',
    );
  }
  // const rep = tail_sep ? repeat1 : repeat;
  // return seq(
  //   '(',
  //   optional(seq(
  //     rep(seq(
  //       rule,
  //       ',',
  //     )),
  //     optional(rule),
  //   )),
  //   ')',
  // );
}
