package com.shopnow.inventoryservice.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class RedisLockService {

    private final RedisTemplate<String, Object> redisTemplate;
    // Local fallback locks map
    private final ConcurrentHashMap<String, ReentrantLock> localLocks = new ConcurrentHashMap<>();

    public RedisLockService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean acquireLock(String lockKey, String value, long timeoutSeconds) {
        try {
            Boolean success = redisTemplate.opsForValue().setIfAbsent(lockKey, value, Duration.ofSeconds(timeoutSeconds));
            return Boolean.TRUE.equals(success);
        } catch (Exception e) {
            // Redis is unavailable, fall back to local locks
            ReentrantLock localLock = localLocks.computeIfAbsent(lockKey, k -> new ReentrantLock());
            return localLock.tryLock();
        }
    }

    public void releaseLock(String lockKey, String value) {
        try {
            Object currentValue = redisTemplate.opsForValue().get(lockKey);
            if (value.equals(currentValue)) {
                redisTemplate.delete(lockKey);
            }
        } catch (Exception e) {
            // Redis is unavailable, release local lock
            ReentrantLock localLock = localLocks.get(lockKey);
            if (localLock != null && localLock.isHeldByCurrentThread()) {
                localLock.unlock();
            }
        }
    }
}
