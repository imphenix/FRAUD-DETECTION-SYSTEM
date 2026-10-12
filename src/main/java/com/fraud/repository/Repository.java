package com.fraud.repository;

import com.fraud.exception.DatabaseException;

import java.sql.Connection;
import java.util.List;
import java.util.Optional;

/**
 * Generic Repository abstraction representing the Data Access Object (DAO) contract.
 *
 * Demonstrates:
 * - Java Generics (<T, ID>) for type-safe persistence operations
 * - Decoupling database query mechanisms from higher-level service/business logic
 * - Functional constructs such as java.util.Optional to eliminate NullPointerExceptions
 * - Overloaded methods supporting both autonomous pooled connections and ambient JDBC transactions
 *
 * @param <T>  The domain entity type managed by this repository
 * @param <ID> The primary key / unique identifier type for the entity
 */
public interface Repository<T, ID> {

    /**
     * Persists a new entity into the database using a pooled connection.
     *
     * @param entity the entity to create
     * @return the saved entity, typically populated with the auto-generated ID
     * @throws DatabaseException if SQL execution fails
     */
    T save(T entity) throws DatabaseException;

    /**
     * Persists a new entity within an existing transactional JDBC connection.
     *
     * @param entity the entity to create
     * @param connection the active transactional connection
     * @return the saved entity with generated ID
     * @throws DatabaseException if SQL execution fails
     */
    T save(T entity, Connection connection) throws DatabaseException;

    /**
     * Retrieves an entity by its primary key.
     *
     * @param id the entity identifier
     * @return an Optional containing the found entity, or Optional.empty() if not found
     * @throws DatabaseException if SQL query execution fails
     */
    Optional<T> findById(ID id) throws DatabaseException;

    /**
     * Retrieves all entities belonging to this repository.
     *
     * @return a List of entities
     * @throws DatabaseException if SQL query execution fails
     */
    List<T> findAll() throws DatabaseException;

    /**
     * Updates an existing entity in the database.
     *
     * @param entity the entity containing updated fields
     * @return the updated entity
     * @throws DatabaseException if SQL execution fails
     */
    T update(T entity) throws DatabaseException;

    /**
     * Updates an existing entity within an active transactional JDBC connection.
     *
     * @param entity the entity containing updated fields
     * @param connection the active transactional connection
     * @return the updated entity
     * @throws DatabaseException if SQL execution fails
     */
    T update(T entity, Connection connection) throws DatabaseException;

    /**
     * Deletes an entity by its primary key.
     *
     * @param id the identifier of the entity to delete
     * @return true if an entity was deleted, false otherwise
     * @throws DatabaseException if SQL execution fails
     */
    boolean deleteById(ID id) throws DatabaseException;

    /**
     * Returns the total count of records in this repository table.
     *
     * @return total record count
     * @throws DatabaseException if SQL count query fails
     */
    long count() throws DatabaseException;

    /**
     * Checks if an entity exists by its primary key.
     *
     * @param id the identifier to test
     * @return true if the entity exists, false otherwise
     * @throws DatabaseException if SQL check fails
     */
    boolean existsById(ID id) throws DatabaseException;
}
