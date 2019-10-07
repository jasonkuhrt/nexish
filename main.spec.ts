import { object } from './main'

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
    expect(Foo.toConfig()).toMatchSnapshot()
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
    expect(Foo.toConfig()).toMatchSnapshot()
  })
})
