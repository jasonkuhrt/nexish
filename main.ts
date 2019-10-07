import * as GQL from 'graphql'

// IDEA Maybe we want to replce field option `type` with `returns`

// TODO description support
// TODO enum
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
// TODO typegen

//
//
// General Utility Belt
// ====================
//

type Predicate<T> = (x: T) => boolean

/**
 * Index types are just an alias for Records
 * whose keys are of type `string`. The name
 * of this type, `Index`, signifies its canonical
 * use-case for data indexed by some property, e.g.
 * a list of users indexed by email.
 */
export type Index<T> = Record<string, T>

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
  export type StandardScalarName = 'Int' | 'Float' | 'ID' | 'Boolean' | 'String'

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

type Block<TypeDefiner extends unknown> = {
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

// TODO `string` should become a typegen lookup;
// Until this is fixed autocompletion for FoxFieldType
// will be lost, as all other members here are string subset
type FoxFieldType = GQL2.StandardScalarName | GQL2.GraphQLType | string

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
      state.fields.push({ name, ...options, type: GQL.GraphQLInt.name })
    },
    string: (name, options) => {
      state.fields.push({ name, ...options, type: GQL.GraphQLString.name })
    },
    boolean: (name, options) => {
      state.fields.push({ name, ...options, type: GQL.GraphQLBoolean.name })
    },
    id: (name, options) => {
      state.fields.push({ name, ...options, type: GQL.GraphQLID.name })
    },
  }
}

const createObjectBlockState = (): ObjectDefinerState => ({
  fields: [],
})

type Spec = ObjectSpec

type ObjectSpec = {
  name: string
  fields: ObjectFieldSpec[]
}

type ObjectFieldSpec = FieldOptions & {
  name: string
  resolve: Resolver
}

// const foxSpecToGQLType (spec: Spec): GQL2.GraphQLType => {}

/**
 * A Fox block for defining GraphQL Object types.
 */
const object = (block: Block<ObjectDefiner>): Spec => {
  const spec = {} as Spec
  const state = createObjectBlockState()
  block.definition(createObjectDefiner(state))
  spec.name = block.name
  spec.fields = []
  for (const field of state.fields) {
    spec.fields.push({
      ...field,
      // TODO default resolver does not make sense for non-scalar-returning fields
      resolve: field.resolve || defaultResolver(field.name),
    })
  }
  return spec

  // // Convert from the way Fox accepts field data to the way GraphQL lib does
  // let gqlLibFields: GQL.GraphQLObjectTypeConfig<any, any>['fields'] = {}
  // for (const stateField of state.fields) {
  //   gqlLibFields[stateField.name] = {
  //     type: foxFieldTypeToGQLFieldType(stateField.type),
  //     // TODO default resolver does not make sense for non-scalar-returning fields
  //     resolve: stateField.resolve || defaultResolver(stateField.name),
  //   }
  // }

  // return new GQL.GraphQLObjectType({
  //   name: spec.name,
  //   fields: gqlLibFields,
  // })
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
const enom = (spec: Block<EnumDefiner>): GQL.GraphQLEnumType => {
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

type TypeDefIndex = Index<TypeDefIndexMember>
type TypeDefIndexMember = {
  spec: Spec
  gqlInstance?: GQL2.GraphQLType
}

/**
 * Walk and de-stringref the given types.
 *
 * de-stringref means that fields whose types are string names of other types in
 * the schema rather than actual references are replaced with references.
 */
export const build = (specs: Spec[]): GQL2.GraphQLType[] => {
  // 1. walk all specs to build a type def index
  // 2. walk all specs to build gql types
  //    when a non-scalar is found, dig in (depth first) to build it first
  //    if a circular dep is detected, resort to thunk

  const typeDefIndex: TypeDefIndex = {}
  walk(specs, typeDefIndex)
  return constructGQLInstances(typeDefIndex)
}

const walk = (specs: Spec[], typeDefIndex: TypeDefIndex) => {
  for (const spec of specs) {
    typeDefIndex[spec.name] = {
      spec,
    }
    // walk inline types
    // spec.fields.
  }
}

const constructGQLInstances = (
  typeDefIndex: TypeDefIndex,
): GQL2.GraphQLType[] => {
  for (const typeDef of Object.values(typeDefIndex)) {
    doBuild(typeDef, typeDefIndex)
  }
  return Object.values(typeDefIndex).map(typeDef => typeDef.gqlInstance!)
}

const doBuild = (typeDef: TypeDefIndexMember, typeDefIndex: TypeDefIndex) => {
  // Might have been built by dependency resolution
  if (!typeDef.gqlInstance) {
    typeDef.gqlInstance = new GQL.GraphQLObjectType({
      name: typeDef.spec.name,
      fields: typeDef.spec.fields.reduce(
        (gqlFields: any, field) => {
          let type
          if (GQL2.isType(field.type)) {
            type = field.type
          } else if (typeDefIndex[field.type]) {
            if (!typeDefIndex[field.type].gqlInstance) {
              doBuild(typeDefIndex[field.type], typeDefIndex)
            }
            type = typeDefIndex[field.type].gqlInstance!
          } else {
            type = fieldTypeToGQLFieldType(field.type)
          }
          gqlFields[field.name] = {
            resolve: field.resolve,
            type,
          }
          return gqlFields
        },
        {} as GQL.GraphQLObjectTypeConfig<any, any>['fields'],
      ),
    })
  }
}

/**
 * Build a schema from the given Fox Blocks
 */
const createSchema = (specs: Spec[]): GQL.GraphQLSchema => {
  // QUESTION Why does TS consider the `query` access as not nullable? ...
  // PERF we could using a find that short-circuites
  const [[query], types] = partition(GQL2.isQueryObject, build(specs))
  // TODO query could be undefined
  return new GQL.GraphQLSchema({
    types,
    query: query as GQL.GraphQLObjectType, // guaranteed by partition predicate
  })
}

/**
 * Convert from a GraphQL type representation in Fox to GraphQL lib.
 */
const fieldTypeToGQLFieldType = (
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
        // return foxFieldType as any
        throw new Error(
          `Do not know how to convert fox type "${foxFieldType}" to GraphQL lib type.`,
        )
      }
  }
}

export { object, enom, createSchema }
