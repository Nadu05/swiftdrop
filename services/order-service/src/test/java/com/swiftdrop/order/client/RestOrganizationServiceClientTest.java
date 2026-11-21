package com.swiftdrop.order.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.dto.RouteBranchResolutionDto;
import com.swiftdrop.order.exception.ExternalServiceUnavailableException;
import com.swiftdrop.order.exception.InvalidBranchCoverageException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServiceUnavailable;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RestOrganizationServiceClientTest {

    private MockRestServiceServer mockServer;
    private RestOrganizationServiceClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        client = new RestOrganizationServiceClient(builder, "http://organization-service:8082", new ObjectMapper());
    }

    @Test
    void resolveRoute_ValidOriginAndDestinationPostalCodes_ReturnsBothBranches() {
        String responseJson = """
                {
                  "originBranch": {
                    "branchId": 1,
                    "branchCode": "CMB-CENTRAL",
                    "branchName": "Colombo Central Hub",
                    "distanceKm": 0.0,
                    "eligible": true
                  },
                  "destinationBranch": {
                    "branchId": 2,
                    "branchCode": "KDY-MAIN",
                    "branchName": "Kandy Regional Hub",
                    "distanceKm": 0.0,
                    "eligible": true
                  },
                  "interBranchDistanceKm": 94.8,
                  "sameBranch": false
                }
                """;

        mockServer.expect(requestTo("http://organization-service:8082/api/v1/branches/resolve-route"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.pickupPostalCode").value("00100"))
                .andExpect(jsonPath("$.dropoffPostalCode").value("20000"))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        RouteBranchResolutionDto result = client.resolveRoute("00100", "20000");

        assertThat(result.getOriginBranch().getBranchId()).isEqualTo(1L);
        assertThat(result.getOriginBranch().getBranchCode()).isEqualTo("CMB-CENTRAL");
        assertThat(result.getDestinationBranch().getBranchId()).isEqualTo(2L);
        assertThat(result.getDestinationBranch().getBranchCode()).isEqualTo("KDY-MAIN");
        assertThat(result.isSameBranch()).isFalse();
        mockServer.verify();
    }

    @Test
    void resolveRoute_WhenOrganizationServiceReturns422ForDestination_ThrowsInvalidBranchCoverageException() {
        String errorJson = """
                {
                  "status": 422,
                  "error": "Unprocessable Entity",
                  "locationType": "DESTINATION",
                  "message": "Destination postal code '40000' is not covered by any active branch"
                }
                """;

        mockServer.expect(requestTo("http://organization-service:8082/api/v1/branches/resolve-route"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(errorJson));

        assertThatThrownBy(() -> client.resolveRoute("00100", "40000"))
                .isInstanceOf(InvalidBranchCoverageException.class)
                .satisfies(ex -> {
                    InvalidBranchCoverageException coverageEx = (InvalidBranchCoverageException) ex;
                    assertThat(coverageEx.getLocationType()).isEqualTo("DESTINATION");
                    assertThat(coverageEx.getMessage()).contains("40000");
                });

        mockServer.verify();
    }

    @Test
    void resolveRoute_WhenOrganizationServiceUnavailable_ThrowsExternalServiceUnavailableException() {
        mockServer.expect(requestTo("http://organization-service:8082/api/v1/branches/resolve-route"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServiceUnavailable());

        assertThatThrownBy(() -> client.resolveRoute("00100", "20000"))
                .isInstanceOf(ExternalServiceUnavailableException.class)
                .hasMessageContaining("Unable to verify branch coverage with Organization Service");

        mockServer.verify();
    }
}
