package org.jimmyl.ezstat.Converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Converter(autoApply = true)
public class YearMonthConverter implements AttributeConverter<YearMonth, String> {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    @Override
    public String convertToDatabaseColumn(YearMonth yearMonth) {
        if(yearMonth == null) {
            return null;
        }
        return yearMonth.format(FORMATTER);
    }

    @Override
    public YearMonth convertToEntityAttribute(String dbData) {
        if(dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            return YearMonth.parse(dbData, FORMATTER);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(
                    "Invalid yearMonth format: " + dbData + ", expected format: yyyy-MM", e
            );
        }
    }
}
