package com.swiftdrop.order.branch;

import com.swiftdrop.order.exception.BusinessRuleException;
import com.swiftdrop.order.location.City;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** The Organization client against a stubbed HTTP endpoint (no network). */
class OrganizationBranchResolverTest {

    private static final String URL = "http://organization.test/api/v1/branches/resolve";
    private static final City COLOMBO = new City("COLOMBO", "Colombo", "Colombo", 6.9271, 79.8612);

    private MockRestServiceServer server;
    private OrganizationBranchResolver resolver;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://organization.test");
        server = MockRestServiceServer.bindTo(builder).build();
        resolver = new OrganizationBranchResolver(builder.build());
    }

    @Test
    @DisplayName("sends the pickup town's coordinates and returns the branch the Organization service chose")
    void resolvesBranch() {
        server.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.latitude").value(6.9271))
                .andExpect(jsonPath("$.longitude").value(79.8612))
                .andRespond(withSuccess("""
                        {"branchId":7,"branchCode":"CMB-CEN","branchName":"Colombo Central",
                         "distanceKm":2.81,"eligible":true,"somethingNew":"ignored"}""", MediaType.APPLICATION_JSON));

        Optional<ResolvedBranch> branch = resolver.resolve(COLOMBO);

        assertThat(branch).contains(new ResolvedBranch(7L, "CMB-CEN", "Colombo Central", 2.81));
        server.verify();
    }

    @Test
    @DisplayName("a 422 (no service area covers the pickup) becomes a business-rule error")
    void notServed() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                .contentType(MediaType.APPLICATION_JSON).body("{\"message\":\"no area\"}"));

        assertThatThrownBy(() -> resolver.resolve(COLOMBO))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage(OrganizationBranchResolver.NOT_SERVED_MESSAGE);
    }

    @Test
    @DisplayName("an answer that says eligible=false is treated as not served")
    void notEligible() {
        server.expect(requestTo(URL)).andRespond(withSuccess(
                "{\"branchId\":7,\"branchName\":\"X\",\"distanceKm\":1.0,\"eligible\":false}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> resolver.resolve(COLOMBO)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    @DisplayName("a 500 from the Organization service is reported as unavailable (503)")
    void serverError() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> resolver.resolve(COLOMBO))
                .isInstanceOf(BranchServiceUnavailableException.class)
                .hasMessage(OrganizationBranchResolver.UNAVAILABLE_MESSAGE);
    }

    @Test
    @DisplayName("any other client error (for example 400 or 401) is unavailable, not 'not served'")
    void otherClientError() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> resolver.resolve(COLOMBO)).isInstanceOf(BranchServiceUnavailableException.class);
    }

    @Test
    @DisplayName("a connection failure or timeout is unavailable")
    void connectionFailure() {
        server.expect(requestTo(URL)).andRespond(request -> {
            throw new IOException("connection refused");
        });

        assertThatThrownBy(() -> resolver.resolve(COLOMBO)).isInstanceOf(BranchServiceUnavailableException.class);
    }

    @Test
    @DisplayName("an answer without a branch id is unavailable")
    void missingBranchId() {
        server.expect(requestTo(URL)).andRespond(withSuccess("{\"eligible\":true}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> resolver.resolve(COLOMBO)).isInstanceOf(BranchServiceUnavailableException.class);
    }

    @Test
    @DisplayName("an empty answer body is unavailable")
    void emptyBody() {
        server.expect(requestTo(URL)).andRespond(withSuccess());

        assertThatThrownBy(() -> resolver.resolve(COLOMBO)).isInstanceOf(BranchServiceUnavailableException.class);
    }
}
