import * as GQL from 'graphql'
import { object, enom, createSchema } from './main'

const Colors = enom({
  name: 'Colors',
  definition: t => {
    t.member('red')
    t.member('blue')
    t.member('black')
  },
})

const Person = object({
  name: 'Person',
  definition: t => {
    t.field('firstName', {
      type: 'String',
      resolve: () => 'jason',
    })
    t.field('lastName', {
      type: 'String',
    })
    t.int('age')
    t.field('preferredColor', {
      type: 'String',
    })
  },
})

const Query = object({
  name: 'Query',
  definition: t => {
    t.field('person', {
      type: Person,
      resolve: () => ({ firstName: 'jason', lastName: 'kuhrt' }),
    })
    t.string('hello', {
      resolve: () => 'world',
    })
  },
})

const schema = createSchema([Person, Query, Colors])
// TODO Example of runtime error, add valiation
// const schema = createSchema([Person])

//
//
// Test Drive the App
// ==================
//

GQL.printSchema(schema) // ?

GQL.graphql(
  schema,
  `
query {
  hello
  person {
    firstName
    lastName
  }
}
`,
) // ?

//
//
// Misc Exploration
// ================
//
