import { describe, it } from 'node:test'
import assert from 'node:assert'
import parseFictionArgs from './parseFictionArgs.js'

describe('bot', function() {
  describe('parsing `/fiction` arguments', function() {
    it('parses "/fiction author:bob" into {author: "bob"}', function() {
      assert.deepEqual(parseFictionArgs('/fiction author:bob'), { author: 'bob' })
    })

    it('parses "/fiction topic:bananas" into {topic: "bananas"}', function() {
      assert.deepEqual(parseFictionArgs('/fiction topic:bananas'), { topic: 'bananas' })
    })

    it('parses "/fiction topic:bananas author:john silver" into {topic: "bananas", author: "john silver"}', function() {
      assert.deepEqual(parseFictionArgs('/fiction author:john silver topic:bananas'), { author: 'john silver', topic: 'bananas' })
    })

    it('parses "/fiction topic:bananas,author:john silver" into {topic: "bananas", author: "john silver"}', function() {
      assert.deepEqual(parseFictionArgs('/fiction author:john silver,topic:bananas'), { author: 'john silver', topic: 'bananas' })
    })
  })
})
