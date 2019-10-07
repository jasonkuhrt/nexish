import { object } from './main'

describe('defining object types', () => {
  it('of built in scalars', () => {
    const Foo = object({
      name: 'Foo',
      definition: t => {
        t.boolean('boolean')
        t.string('string')
        t.id('id')
        t.int('int')
      },
    })
    expect(Foo.toConfig()).toMatchSnapshot()
  })
})
