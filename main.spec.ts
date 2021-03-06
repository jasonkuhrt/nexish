import { object, createSchema, build } from './main'
import * as GQL from 'graphql'

describe('defining blocks', () => {
  it('is possible to define scalar fields', () => {
    const Foo = object({
      name: 'Foo',
      definition: t => {
        t.field('boolean', { type: 'Boolean' })
        t.field('string', { type: 'String' })
        t.field('id', { type: 'ID' })
        t.field('int', { type: 'Int' })
        t.field('float', { type: 'Float' })
      },
    })
    expect(Foo).toMatchSnapshot()
  })

  it('is possible to define inline field types', () => {
    const A = object({
      name: 'A',
      definition: t => {
        t.field('foo', {
          type: new GQL.GraphQLObjectType({
            name: 'B',
            fields: {
              bar: {
                type: GQL.GraphQLString,
              },
            },
          }),
        })
      },
    })
    expect(A).toMatchSnapshot()
  })

  it('is possible to use shorthand for scalars', () => {
    const Foo = object({
      name: 'Foo',
      definition: t => {
        t.boolean('boolean')
        t.string('string')
        t.id('id')
        t.int('int')
        t.int('float')
      },
    })
    expect(Foo).toMatchSnapshot()
  })
})

describe('defining schemas', () => {
  it('is possible to for field types to reference-by-string', () => {
    const A = object({
      name: 'A',
      definition: t => {
        t.field('foo', { type: 'B' })
      },
    })
    const B = object({
      name: 'B',
      definition: t => {
        t.string('bar')
      },
    })
    expect(GQL.printSchema(createSchema([A, B]))).toMatchSnapshot()
  })
})
