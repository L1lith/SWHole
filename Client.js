const parseMessage = require('./parseMessage')
const autoBind = require('./autoBind')

class TooSWeetClient {
  constructor(worker, listen=true) {
    if (worker === undefined && window && window.navigator && window.navigator.serviceWorker) worker = window.navigator.serviceWorker
    if (!(worker instanceof ServiceWorkerContainer)) throw new Error('Invalid Worker')
    if (typeof worker.controller != 'object' || worker.controller === null) throw new Error('Worker controller invalid')
    autoBind(this)
    this.listeners = {message: [], disconnected: [], connected: [], event: []}
    this.eventListeners = {}
    this.worker = worker
    this.connected = false
    this.listening = false
    this.heartbeat = null
    this.heartbeatRate = 1000
    if (listen === true) this.listen()
  }
  listen() {
    if (this.listening === true) throw new Error('Client Already Listening')
    this.listening = true
    this.worker.addEventListener('message', this.onMessage)
    this.send({type: "connect"})
    this.startHeartbeat()
  }
  startHeartbeat() {
    if (this.heartbeat !== null) throw new Error('Heartbeat not null!')
    this.heartbeat = setInterval(this.doHeartbeat, this.heartbeatRate)
  }
  stopHeartbeat() {
    clearInterval(this.heartbeat)
    this.heartbeat = null
  }
  doHeartbeat() {
    this.send({type: 'heartbeat'})
  }
  close() {
    if (this.listening !== true) throw new Error('SWHellServer Not Listening')
    this.listening = false
    this.worker.removeEventListener('message', this.onMessage)
    this.stopHeartbeat()
  }
  send(message) {
    message = parseMessage(message, false)
    this.worker.controller.postMessage(message)
  }
  on(eventType, callback) {
    if (typeof eventType != 'string' || !this.listeners.hasOwnProperty(eventType)) throw new Error('Invalid Event Type')
    this.listeners[eventType].push(callback)
  }
  onEvent(eventType, callback) {
    if (typeof eventType != 'string' || eventType.length < 1) throw new Error('Invalid Event Type')
    if (!this.eventListeners.hasOwnProperty(eventType)) this.eventListeners[eventType] = []
    this.eventListeners[eventType].push(callback)
  }
  onMessage(event) {
    const message = parseMessage(event.data, true)
    if (message === null) return console.warn('Client got a malformed message')
    if (message.type === 'disconnected') return this.disconnected(message)
    if (message.type === 'connected') return this.onConnected(message)
    this.listeners.event.forEach(listener => listener(message))
    this.listeners.message.forEach(listener => listener(message.body))
    if (this.eventListeners.hasOwnProperty(message.type)) this.eventListeners[message.type].forEach(listener => listener(message))
  }
  onConnected(message) {
    this.connected = true
    this.listeners.connected.forEach(listener => listener(message.body))
  }
  disconnected(message) {
    this.connected = false
    this.close()
    this.listeners.disconnected.forEach(listener => listener(message.body))
  }
}

module.exports = TooSWeetClient
