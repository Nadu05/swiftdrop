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
    void resolveRoute_ValidOriginAndDestinationCoverage_ReturnsBothBranches() {
        String responseJson = """
                {
                  "originBranch": {
                    "branchId": 1,
                    "branchCode": "CMB-CENTRAL",
                    "branchName": "Colombo Central Hub",
                    "city": "Colombo",
                    "distanceKm": 1.4,
                    "serviceRadiusKm": 25.0,
                    "eligible": true
                  },
                  "destinationBranch": {
                    "branchId": 2,
                    "branchCode": "KDY-MAIN",
                    "branchName": "Kandy Regional Hub",
                    "city": "Kandy",
                    "distanceKm": 2.1,
                    "serviceRadiusKm": 20.0,
                    "eligible": true
                  },
                  "interBranchStraightLineDistanceKm": 94.8,
                  "pickupToDestinationStraightLineDistanceKm": 95.3,
                  "sameBranch": false
                }
                """;

        mockServer.expect(requestTo("http://organization-service:8082/api/v1/branches/resolve-route"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        RouteBranchResolutionDto result = client.resolveRoute(6.9271, 79.8612, 7.2906, 80.6337);

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
                  "message": "Destination location (9.6615, 80.0255) is outside the active service area of nearest branch Kandy Regional Hub"
                }
                """;

        mockServer.expect(requestTo("http://organization-service:8082/api/v1/branches/resolve-route"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(errorJson));

        assertThatThrownBy(() -> client.resolveRoute(6.9271, 79.8612, 9.6615, 80.0255))
                .isInstanceOf(InvalidBranchCoverageException.class)
                .satisfies(ex -> {
                    InvalidBranchCoverageException coverageEx = (InvalidBranchCoverageException) ex;
                    assertThat(coverageEx.getLocationType()).isEqualTo("DESTINATION");
                    assertThat(coverageEx.getMessage()).contains("outside the active service area");
                });

        mockServer.verify();
    }

    @Test
    void resolveRoute_WhenOrganizationServiceUnavailable_ThrowsExternalServiceUnavailableException() {
        mockServer.expect(requestTo("http://organization-service:8082/api/v1/branches/resolve-route"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServiceUnavailable());

        assertThatThrownBy(() -> client.resolveRoute(6.9271, 79.8612, 7.2906, 80.6337))
                .isInstanceOf(ExternalServiceUnavailableException.class)
                .hasMessageContaining("Unable to verify branch coverage with Organization Service");

        mockServer.verify();
    }
}

