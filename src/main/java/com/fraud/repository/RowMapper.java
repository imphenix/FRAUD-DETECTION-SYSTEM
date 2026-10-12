package com.fraud.repository;

import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Functional interface mapping a single row of a JDBC {@link ResultSet} to an entity domain object.
 *
 * Demonstrates:
 * - Functional programming in Java
 * - Generic return types (<T>)
 * - Abstraction of SQL column mapping
 *
 * @param <T> the target entity type
 */
@FunctionalInterface
public interface RowMapper<T> {

    /**
     * Maps the current row of the given ResultSet to an object of type T.
     *
     * @param rs the ResultSet positioned at the current row
     * @return the mapped entity instance
     * @throws SQLException if an error occurs reading the ResultSet
     */
    T mapRow(ResultSet rs) throws SQLException;
}
