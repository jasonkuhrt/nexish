import * as GQL from 'graphql'

// IDEA Maybe we want to replce field option `type` with `returns`

// TODO description support
// TODO add support for specifying type by string, then performing a walk to resolve them at fox-build time
// TODO enum shorthands:
//  - enom('colors', 'red', 'blue', 'black')
//  - enom('colors', ['red', 'blue', 'black'])
//  - enom('colors', ['red', 1], ['blue', 2], ['black', 3])
//  - enom('colors', [['red', 1], ['blue', 2], ['black', 3]])
//  - enom('colors', [{'red': 1}, {'blue': 2}, {'black': 3}])
//  - t.member('red', 1)
//  - t.members ... <-- same as ultra-short-hands
// TODO list
// TODO nullable
// TODO args
// TODO dynamics
// TODO field type derefing

//
//
// General Utility Belt
// ====================
//

type Predicate<T> = (x: T) => boolean

const partition = <T>(predicate: Predicate<T>, xs: T[]): [T[], T[]] => {
  const left: T[] = []
  const right: T[] = []

  for (const x of xs) {
    if (predicate(x)) {
      left.push(x)
    } else {
      right.push(x)
    }
  }

  return [left, right]
}

//
//
// GraphQL Lib Extensions
// ======================
//

namespace GQL2 {
  export type GraphQLType =
    | GQL.GraphQLObjectType<any, any, any>
    | GQL.GraphQLScalarType
    | GQL.GraphQLEnumType
}

const GQL2 = {
  isType: (foxFieldType: FoxFieldType): foxFieldType is GQL2.GraphQLType => {
    return (
      GQL.isScalarType(foxFieldType) ||
      GQL.isObjectType(foxFieldType) ||
      GQL.isEnumType(foxFieldType)
    )
  },
  isQueryObject: (type: GQL2.GraphQLType): type is GQL.GraphQLObjectType => {
    return type.name === 'Query'
  },
}

//
//
// Fox Library
// ===========
//

type Arg = {}

type Resolver = (rootOrParent: any, args: any, ctx: any, info: any) => any

type Spec<TypeDefiner extends unknown> = {
  name: string
  definition: (typeDefiner: TypeDefiner) => void
}

// Fox Blocks

type FieldOptions = {
  type: FoxFieldType
  args?: Arg[]
  resolve?: Resolver
}

type IntFieldOptions = Omit<FieldOptions, 'type'>
type StringFieldOptions = Omit<FieldOptions, 'type'>
type BooleanFieldOptions = Omit<FieldOptions, 'type'>
type IDFieldOptions = Omit<FieldOptions, 'type'>

type FoxFieldType =
  | 'Int'
  | 'String'
  | 'Boolean'
  | 'ID'
  | 'Float'
  | string // TODO `string` should become a typegen lookup
  | GQL2.GraphQLType

/**
 * A defualt resolver factory. It applies the strategy
 * of looking for the field name from the parent.
 */
const defaultResolver = (fieldName: string): Resolver => {
  return (parent, _args, _ctx, _info) => parent[fieldName]
}

type ObjectDefiner = {
  field: (name: string, options: FieldOptions) => void
  int: (name: string, options?: IntFieldOptions) => void
  string: (name: string, options?: StringFieldOptions) => void
  boolean: (name: string, options?: BooleanFieldOptions) => void
  id: (name: string, options?: IDFieldOptions) => void
}

type ObjectDefinerState = {
  fields: Array<FieldOptions & { name: string }>
}

/**
 * A factory for creating type definers. These are the `t`
 * objects that get passed into block defintiion functions.
 */
const createObjectDefiner = (state: ObjectDefinerState): ObjectDefiner => {
  // TODO create an intermediary between state and typeDefiner. The
  // motivation is to allow typeDefiner to return things and have
  // state pick them up. By returning things we can build invariants
  // like `id: ...` field definer must contain `type: 'id'`
  return {
    field: (name, options) => {
      state.fields.push({ name, ...options })
    },
    int: (name, options) => {
      state.fields.push({ name, ...options, type: GQL.GraphQLInt })
    },
    string: (name, options) => {
      state.fields.push({ name, ...options, type: GQL.GraphQLString })
    },
    boolean: (name, options) => {
      state.fields.push({ name, ...options, type: GQL.GraphQLBoolean })
    },
    id: (name, options) => {
      state.fields.push({ name, ...options, type: GQL.GraphQLID })
    },
  }
}

const createObjectBlockState = (): ObjectDefinerState => ({
  fields: [],
})

/**
 * A Fox block for defining GraphQL Object types.
 */
const object = (spec: Spec<ObjectDefiner>): GQL.GraphQLObjectType => {
  const state = createObjectBlockState()
  spec.definition(createObjectDefiner(state))

  // Convert from the way Fox accepts field data to the way GraphQL lib does
  let gqlLibFields: GQL.GraphQLObjectTypeConfig<any, any>['fields'] = {}
  for (const stateField of state.fields) {
    gqlLibFields[stateField.name] = {
      type: foxFieldTypeToGQLFieldType(stateField.type),
      // TODO default resolver does not make sense for non-scalar-returning fields
      resolve: stateField.resolve || defaultResolver(stateField.name),
    }
  }

  return new GQL.GraphQLObjectType({
    name: spec.name,
    fields: gqlLibFields,
  })
}

type EnumDefinerState = {
  members: string[]
}

type EnumDefiner = {
  member: (name: string) => void
}

const createEnumDefiner = (state: EnumDefinerState): EnumDefiner => {
  // TODO create an intermediary between state and typeDefiner. The
  // motivation is to allow typeDefiner to return things and have
  // state pick them up. By returning things we can build invariants
  // like `id: ...` field definer must contain `type: 'id'`
  return {
    member: name => {
      state.members.push(name)
    },
  }
}

const createEnumDefinerState = (): EnumDefinerState => ({ members: [] })

/**
 * A Fox Block for defining GraphQL Enum types.
 */
const enom = (spec: Spec<EnumDefiner>): GQL.GraphQLEnumType => {
  const state = createEnumDefinerState()
  spec.definition(createEnumDefiner(state))
  return new GQL.GraphQLEnumType({
    name: spec.name,
    values: state.members.reduce(
      (acc, mem) => Object.assign(acc, { [mem]: { value: mem } }),
      {},
    ),
  })
}

// utils

/**
 * Build a schema from the given Fox Blocks
 */
const createSchema = (allTypes: GQL2.GraphQLType[]): GQL.GraphQLSchema => {
  // QUESTION Why does TS consider the `query` access as not nullable? ...
  const [[query], types] = partition(GQL2.isQueryObject, allTypes)
  // TODO deref block string references (field types)
  // TODO query could be undefined
  return new GQL.GraphQLSchema({
    types,
    query: query as GQL.GraphQLObjectType, // guaranteed by partition predicate
  })
}

/**
 * Convert from a GraphQL type representation in Fox to GraphQL lib.
 */
const foxFieldTypeToGQLFieldType = (
  foxFieldType: FoxFieldType,
): GQL2.GraphQLType => {
  switch (foxFieldType) {
    case 'String':
      return GQL.GraphQLString
    case 'Int':
      return GQL.GraphQLInt
    case 'ID':
      return GQL.GraphQLID
    case 'Boolean':
      return GQL.GraphQLBoolean
    case 'Float':
      return GQL.GraphQLFloat
    default:
      if (GQL2.isType(foxFieldType)) {
        return foxFieldType
      } else {
        // return foxFieldType
        throw new Error(
          `Do not know how to convert fox type "${foxFieldType}" to GraphQL lib type.`,
        )
      }
  }
}

export { object, enom, createSchema }
