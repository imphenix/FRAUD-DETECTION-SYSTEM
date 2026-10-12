package com.fraud.service;

import com.fraud.dao.FraudAlertDAO;
import com.fraud.dao.FraudCaseDAO;
import com.fraud.exception.DatabaseException;
import com.fraud.exception.ValidationException;
import com.fraud.model.CaseStatus;
import com.fraud.model.FraudAlert;
import com.fraud.model.FraudCase;
import com.fraud.model.RiskLevel;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Service managing compliance workflows, Fraud Alert inspections, and Fraud Case lifecycles.
 *
 * Demonstrates:
 * - Separation of concerns: encapsulates case status transitions and investigator assignments
 * - Auditing and resolution logging
 * - Querying alerts linked to transactions or customer accounts
 */
public class FraudCaseService {

    private final FraudCaseDAO fraudCaseDAO;
    private final FraudAlertDAO fraudAlertDAO;

    public FraudCaseService() {
        this(new FraudCaseDAO(), new FraudAlertDAO());
    }

    public FraudCaseService(FraudCaseDAO fraudCaseDAO, FraudAlertDAO fraudAlertDAO) {
        this.fraudCaseDAO = Objects.requireNonNull(fraudCaseDAO, "fraudCaseDAO must not be null");
        this.fraudAlertDAO = Objects.requireNonNull(fraudAlertDAO, "fraudAlertDAO must not be null");
    }

    /**
     * Manually opens an investigation fraud case for a suspicious transaction.
     */
    public FraudCase openCase(long transactionId, long userId, int riskScore, String notes)
            throws ValidationException, DatabaseException {

        if (riskScore < 0 || riskScore > 100) {
            throw new ValidationException("Risk score must be between 0 and 100");
        }

        FraudCase fCase = new FraudCase(transactionId, userId, riskScore, notes);
        fCase.setStatus(CaseStatus.OPEN);
        return fraudCaseDAO.save(fCase);
    }

    /**
     * Assigns an open case to a compliance officer or security administrator.
     */
    public FraudCase assignCase(long caseId, long adminId) throws ValidationException, DatabaseException {
        Optional<FraudCase> caseOpt = fraudCaseDAO.findById(caseId);
        if (caseOpt.isEmpty()) {
            throw new ValidationException("Fraud case not found with ID: " + caseId);
        }

        FraudCase fCase = caseOpt.get();
        fCase.setAssignedTo(adminId);
        fCase.setStatus(CaseStatus.INVESTIGATING);
        return fraudCaseDAO.update(fCase);
    }

    /**
     * Resolves an ongoing fraud case with compliance findings and resolution notes.
     */
    public FraudCase resolveCase(long caseId, CaseStatus finalStatus, String resolutionDetails)
            throws ValidationException, DatabaseException {

        if (finalStatus == null) {
            throw new ValidationException("Resolution status is required");
        }
        if (finalStatus == CaseStatus.OPEN || finalStatus == CaseStatus.INVESTIGATING) {
            throw new ValidationException("Case cannot be resolved to an active/investigating state");
        }

        Optional<FraudCase> caseOpt = fraudCaseDAO.findById(caseId);
        if (caseOpt.isEmpty()) {
            throw new ValidationException("Fraud case not found with ID: " + caseId);
        }

        FraudCase fCase = caseOpt.get();
        fCase.setStatus(finalStatus);
        fCase.setResolutionDetails(resolutionDetails);
        return fraudCaseDAO.update(fCase);
    }

    /**
     * Retrieves a case by its internal database ID.
     */
    public Optional<FraudCase> getCaseById(long caseId) throws DatabaseException {
        return fraudCaseDAO.findById(caseId);
    }

    /**
     * Retrieves a case by its tracking case number.
     */
    public Optional<FraudCase> getCaseByCaseNumber(String caseNumber) throws DatabaseException {
        if (caseNumber == null || caseNumber.trim().isEmpty()) {
            return Optional.empty();
        }
        return fraudCaseDAO.findByCaseNumber(caseNumber.trim());
    }

    /**
     * Retrieves all open and active investigation cases.
     */
    public List<FraudCase> getOpenCases() throws DatabaseException {
        return fraudCaseDAO.findOpenCases();
    }

    /**
     * Retrieves all fraud cases in the system.
     */
    public List<FraudCase> getAllCases() throws DatabaseException {
        return fraudCaseDAO.findAll();
    }

    /**
     * Retrieves fraud cases involving a particular customer.
     */
    public List<FraudCase> getCasesByUserId(long userId) throws DatabaseException {
        return fraudCaseDAO.findByUserId(userId);
    }

    /**
     * Retrieves the fraud case associated with a specific transaction.
     */
    public Optional<FraudCase> getCaseByTransactionId(long transactionId) throws DatabaseException {
        return fraudCaseDAO.findByTransactionId(transactionId);
    }

    /**
     * Retrieves all alerts raised for a specific transaction.
     */
    public List<FraudAlert> getAlertsByTransactionId(long transactionId) throws DatabaseException {
        return fraudAlertDAO.findAlertsByTransactionId(transactionId);
    }

    /**
     * Retrieves all alerts involving transactions executed by a specific user.
     */
    public List<FraudAlert> getAlertsByUserId(long userId) throws DatabaseException {
        return fraudAlertDAO.findByUserId(userId);
    }

    /**
     * Retrieves all fraud alerts in the system.
     */
    public List<FraudAlert> getAllAlerts() throws DatabaseException {
        return fraudAlertDAO.findAll();
    }
}
