package com.fraud.collection;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * Generic In-Memory Collection Store.
 *
 * Demonstrates:
 * - Java Generics (<T, ID>) for type-safe memory caching, lookup, and indexing
 * - Use of Java Collections Framework (Map, List)
 * - Decoupling key extraction logic via Function<T, ID>
 * - Defensive read-only views for encapsulation
 *
 * @param <T>  Domain entity type
 * @param <ID> Entity identifier type
 */
public class GenericCollectionStore<T, ID> {

    private final Map<ID, T> store;
    private final Function<T, ID> idExtractor;

    public GenericCollectionStore(Function<T, ID> idExtractor) {
        if (idExtractor == null) {
            throw new IllegalArgumentException("idExtractor cannot be null");
        }
        this.store = new LinkedHashMap<>(); // Maintains insertion order
        this.idExtractor = idExtractor;
    }

    public synchronized void put(T item) {
        if (item != null) {
            ID id = idExtractor.apply(item);
            if (id != null) {
                store.put(id, item);
            }
        }
    }

    public synchronized void putAll(Collection<T> items) {
        if (items != null) {
            for (T item : items) {
                put(item);
            }
        }
    }

    public synchronized Optional<T> get(ID id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(store.get(id));
    }

    public synchronized boolean contains(ID id) {
        return id != null && store.containsKey(id);
    }

    public synchronized boolean remove(ID id) {
        if (id == null) {
            return false;
        }
        return store.remove(id) != null;
    }

    public synchronized List<T> getAll() {
        return Collections.unmodifiableList(new ArrayList<>(store.values()));
    }

    public synchronized int size() {
        return store.size();
    }

    public synchronized boolean isEmpty() {
        return store.isEmpty();
    }

    public synchronized void clear() {
        store.clear();
    }
}
