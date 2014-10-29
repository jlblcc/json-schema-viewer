=begin
* Description: Test Utility functions
* Author: Josh Bradley
* Date: 2014-05-06
* License: Public Domain
=end

require "test/unit"
require File.join(File.dirname(__FILE__),'..','lib', 'adiwg-json_schemas.rb')

class TestUtils < Test::Unit::TestCase
    def test_examples_dir
        errors = File.exist?(ADIWG::JsonSchemas::Utils.examples_dir)
        assert_equal( true, errors, failure_message = 'Examples directory does not exist.')
    end

    def test_schema_path
        errors = File.file?(ADIWG::JsonSchemas::Utils.schema_path)
        assert_equal( true, errors, failure_message = 'File schema.json does not exist.')
    end

    def test_schema_dir
        errors = File.exist?(ADIWG::JsonSchemas::Utils.schema_dir)
        assert_equal( true, errors, failure_message = 'Schema directory does not exist.')
    end
end