---
applyTo: '**/*.ts'
description: 'Performance optimization best practices for TypeScript and Node.js development'
---

# Performance Optimization Best Practices

## General Principles

- **Measure First, Optimize Second:** Profile and measure before optimizing. Use `node --inspect` or Chrome DevTools.
- **Optimize for the Common Case:** Focus on frequently executed code paths.
- **Avoid Premature Optimization:** Write clear, maintainable code first.
- **Minimize Resource Usage:** Use memory, CPU, and network efficiently.

## TypeScript/Node.js Performance

### Async and Event Loop
- Use asynchronous APIs; never use `fs.readFileSync` or other blocking calls in production.
- Use `async/await` consistently; wrap in try/catch with structured errors.
- Use worker threads for CPU-bound tasks to avoid blocking the event loop.
- Use streams for large file or network data processing.
- Limit concurrent open connections to avoid resource exhaustion.

### Data Structures and Algorithms
- Use `Map`/`Set` for fast lookups instead of objects/arrays when appropriate.
- Avoid O(n²) or worse; profile nested loops and refactor to reduce complexity.
- Use batching for bulk operations (e.g., batch database inserts).
- Stream large data sets instead of loading everything into memory.

### Memory Management
- Clean up event listeners, intervals, and references to avoid leaks.
- Use `WeakMap`/`WeakSet` for caches that should allow garbage collection.
- Pool frequently created/destroyed objects (e.g., buffers, connections).
- Profile with `node --inspect` and Chrome DevTools Memory tab.

### Caching
- Cache expensive computations with appropriate TTL.
- Use time-based, event-based, or manual cache invalidation.
- Implement cache stampede protection with locks or request coalescing.

### API and Network
- Minimize payloads; compress responses (gzip, Brotli).
- Paginate large result sets.
- Reuse connections via connection pooling.
- Use retries with exponential backoff for network calls.

### Logging
- Minimize logging in hot paths.
- Use structured logging (JSON format) for easier analysis.

## Code Review Checklist

- [ ] Any algorithmic inefficiencies (O(n²) or worse)?
- [ ] Are data structures appropriate for their use?
- [ ] Any blocking operations in hot paths?
- [ ] Memory leaks or unbounded resource usage?
- [ ] Caching used appropriately with proper invalidation?
- [ ] Large payloads paginated or streamed?
- [ ] Performance-critical paths documented?

## Example: Async I/O

```typescript
// BAD: Blocking
const data = fs.readFileSync('file.txt');

// GOOD: Non-blocking
const data = await fs.promises.readFile('file.txt');
```

## Example: Debouncing

```typescript
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}
```
- [WebPageTest](https://www.webpagetest.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)
- [k6 Load Testing](https://k6.io/)
- [Gatling](https://gatling.io/)
- [Locust](https://locust.io/)
- [OpenTelemetry](https://opentelemetry.io/)
- [Jaeger](https://www.jaegertracing.io/)
- [Zipkin](https://zipkin.io/)

---

## Conclusion

Performance optimization is an ongoing process. Always measure, profile, and iterate. Use these best practices, checklists, and troubleshooting tips to guide your development and code reviews for high-performance, scalable, and efficient software. If you have new tips or lessons learned, add them here—let's keep this guide growing!

---

<!-- End of Performance Optimization Instructions --> 
