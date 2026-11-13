package com.swiftdrop.order.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

/**
 * Maps the role claim of a JWT to Spring authorities: {@code "customer"} becomes {@code ROLE_CUSTOMER}.
 * Accepts either a single string or a list of strings; anything else yields no authorities.
 */
public class JwtRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private static final String ROLE_PREFIX = "ROLE_";

    private final String roleClaim;

    public JwtRoleConverter(String roleClaim) {
        this.roleClaim = roleClaim;
    }

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Object claim = jwt.getClaim(roleClaim);
        List<GrantedAuthority> authorities = new ArrayList<>();
        if (claim instanceof String single) {
            addRole(authorities, single);
        } else if (claim instanceof Collection<?> many) {
            for (Object item : many) {
                if (item instanceof String role) {
                    addRole(authorities, role);
                }
            }
        }
        return authorities;
    }

    private void addRole(List<GrantedAuthority> authorities, String raw) {
        String role = raw.trim().toUpperCase(Locale.ROOT);
        if (role.isEmpty()) {
            return;
        }
        authorities.add(new SimpleGrantedAuthority(role.startsWith(ROLE_PREFIX) ? role : ROLE_PREFIX + role));
    }
}
