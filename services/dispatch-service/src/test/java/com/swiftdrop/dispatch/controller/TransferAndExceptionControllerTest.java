package com.swiftdrop.dispatch.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.dispatch.config.SecurityConfig;
import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.exception.GlobalExceptionHandler;
import com.swiftdrop.dispatch.security.DispatchJwtAuthenticationFilter;
import com.swiftdrop.dispatch.security.DispatchJwtService;
import com.swiftdrop.dispatch.service.CustodyTrackingService;
import com.swiftdrop.dispatch.service.OperationalExceptionService;
import com.swiftdrop.dispatch.service.ReturnTaskService;
import com.swiftdrop.dispatch.service.TransferManifestService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = TransferAndExceptionController.class)
@Import({
        SecurityConfig.class,
        DispatchJwtService.class,
        DispatchJwtAuthenticationFilter.class,
        GlobalExceptionHandler.class
})
class TransferAndExceptionControllerTest {

    private static final String TEST_SECRET = "Y2hhbmdlLW1lLWluLXByb2R1Y3Rpb24tYW5kLXVzZS1hLXN0cm9uZy1zZWNyZXQtaGVyZS0xMjM0NTY3ODk=";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TransferManifestService transferManifestService;

    @MockBean
    private CustodyTrackingService custodyTrackingService;

    @MockBean
    private OperationalExceptionService operationalExceptionService;

    @MockBean
    private ReturnTaskService returnTaskService;

    @Test
    void unauthenticatedRequestsReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/dispatch/transfers/manifests"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/dispatch/returns"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createManifestReturns201AndRejectsConflictWith422AndForbiddenWith403() throws Exception {
        TransferManifestDto dto = new TransferManifestDto();
        dto.setId(1L);
        dto.setManifestCode("TRF-1001");
        dto.setOriginBranchId(1L);
        dto.setDestinationBranchId(2L);
        dto.setStatus("DRAFT");
        when(transferManifestService.createManifest(any(), any())).thenReturn(dto);

        CreateTransferManifestRequest req = new CreateTransferManifestRequest();
        req.setOriginBranchId(1L);
        req.setDestinationBranchId(2L);
        req.setOrderIds(List.of("ORD-1"));

        mockMvc.perform(post("/api/v1/dispatch/transfers/manifests")
                        .header("Authorization", "Bearer " + tokenFor("disp-1", "disp@swiftdrop.lk", "DISPATCHER", 1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.manifestCode").value("TRF-1001"))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        when(transferManifestService.addParcels(eq("TRF-1001"), any(), any()))
                .thenThrow(new DispatchValidationException("CONFLICT_ACTIVE_MANIFEST", "Parcel already assigned"));

        AddManifestParcelsRequest addReq = new AddManifestParcelsRequest();
        addReq.setOrderIds(List.of("ORD-1"));
        mockMvc.perform(post("/api/v1/dispatch/transfers/manifests/TRF-1001/parcels")
                        .header("Authorization", "Bearer " + tokenFor("disp-1", "disp@swiftdrop.lk", "DISPATCHER", 1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("CONFLICT_ACTIVE_MANIFEST"));

        when(transferManifestService.receiveManifest(eq("TRF-1001"), any(), any()))
                .thenThrow(new AccessDeniedException("Wrong branch"));

        mockMvc.perform(post("/api/v1/dispatch/transfers/manifests/TRF-1001/receive")
                        .header("Authorization", "Bearer " + tokenFor("disp-1", "disp@swiftdrop.lk", "DISPATCHER", 1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void reportExceptionAndReturnWorkflowReturnExpectedResponses() throws Exception {
        DeliveryExceptionDto exDto = new DeliveryExceptionDto();
        exDto.setId(44L);
        exDto.setExceptionCode("EXC-44");
        exDto.setExceptionType("DAMAGED_PARCEL");
        exDto.setStatus("OPEN");
        when(operationalExceptionService.reportException(any(), any())).thenReturn(exDto);

        ReportExceptionRequest exReq = new ReportExceptionRequest();
        exReq.setExceptionType("DAMAGED_PARCEL");
        exReq.setDescription("Broken seal on outer package");
        exReq.setOrderId("ORD-44");

        mockMvc.perform(post("/api/v1/dispatch/exceptions")
                        .header("Authorization", "Bearer " + tokenFor("cour-1", "courier@swiftdrop.lk", "COURIER", 1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exceptionCode").value("EXC-44"))
                .andExpect(jsonPath("$.exceptionType").value("DAMAGED_PARCEL"));

        ReturnTaskDto rtsDto = new ReturnTaskDto();
        rtsDto.setId(9L);
        rtsDto.setReturnCode("RTS-900");
        rtsDto.setStatus("RETURNED_TO_SENDER");
        when(returnTaskService.confirmReturnToSender(eq("RTS-900"), any(), any())).thenReturn(rtsDto);

        ConfirmReturnToSenderRequest confirmReq = new ConfirmReturnToSenderRequest();
        confirmReq.setSenderConfirmedBy("Merchant Warehouse Lead");

        mockMvc.perform(post("/api/v1/dispatch/returns/RTS-900/confirm")
                        .header("Authorization", "Bearer " + tokenFor("disp-1", "disp@swiftdrop.lk", "DISPATCHER", 1L))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.returnCode").value("RTS-900"))
                .andExpect(jsonPath("$.status").value("RETURNED_TO_SENDER"));

        CustodyRecordDto custody = new CustodyRecordDto();
        custody.setCustodyCode("CST-10");
        custody.setEventType("DESTINATION_BRANCH_RECEIPT");
        when(custodyTrackingService.getParcelCustodyTimeline(eq("SD-44"), any())).thenReturn(List.of(custody));

        mockMvc.perform(get("/api/v1/dispatch/custody/parcel/SD-44")
                        .header("Authorization", "Bearer " + tokenFor("admin-1", "admin@swiftdrop.lk", "ADMIN", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].custodyCode").value("CST-10"));
    }

    private String tokenFor(String userId, String email, String role, Long branchId) {
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(TEST_SECRET));
        var builder = Jwts.builder()
                .issuer(DispatchJwtService.EXPECTED_ISSUER)
                .subject(userId)
                .claim("email", email)
                .claim("roles", List.of(role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 600_000L));
        if (branchId != null) {
            builder.claim("branchId", branchId);
        }
        return builder.signWith(key).compact();
    }
}

