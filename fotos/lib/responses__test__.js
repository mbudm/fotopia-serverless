import test from 'tape'
import { success, failure } from './responses'

test('success', t => {
  const body = 'success'
  const res = success(body)
  t.equal(res.statusCode, 200)
  t.ok(res.body.indexOf(body))
  t.end()
})

test('failure', t => {
  const body = { error: "Oops"}
  const res = failure(body)
  t.equal(res.statusCode, 500)
  t.equal(res.body, JSON.stringify(body))
  t.end()
})
