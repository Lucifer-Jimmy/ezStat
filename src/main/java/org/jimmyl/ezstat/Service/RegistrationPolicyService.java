package org.jimmyl.ezstat.Service;

import org.jimmyl.ezstat.Config.SecurityProperties;
import org.jimmyl.ezstat.Entity.SystemSetting;
import org.jimmyl.ezstat.Repository.SystemSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationPolicyService {

    private static final String REGISTRATION_OPEN_KEY = "registration.open";

    private final SystemSettingRepository systemSettingRepository;
    private final SecurityProperties securityProperties;

    public RegistrationPolicyService(SystemSettingRepository systemSettingRepository, SecurityProperties securityProperties) {
        this.systemSettingRepository = systemSettingRepository;
        this.securityProperties = securityProperties;
    }

    @Transactional
    public void initializeDefaultIfMissing() {
        if (systemSettingRepository.existsById(REGISTRATION_OPEN_KEY)) {
            return;
        }
        systemSettingRepository.save(new SystemSetting(
                REGISTRATION_OPEN_KEY,
                Boolean.toString(securityProperties.getRegistration().isOpen()),
                null
        ));
    }

    @Transactional(readOnly = true)
    public boolean isRegistrationOpen() {
        return systemSettingRepository.findById(REGISTRATION_OPEN_KEY)
                .map(SystemSetting::getSettingValue)
                .map(Boolean::parseBoolean)
                .orElse(securityProperties.getRegistration().isOpen());
    }

    @Transactional
    public boolean setRegistrationOpen(boolean open) {
        SystemSetting setting = systemSettingRepository.findById(REGISTRATION_OPEN_KEY)
                .orElse(new SystemSetting(REGISTRATION_OPEN_KEY, Boolean.toString(open), null));
        setting.setSettingValue(Boolean.toString(open));
        systemSettingRepository.save(setting);
        return open;
    }
}

