=begin
* Description: Patches json-schema gem to work on windows
* Author: Josh Bradley
* Date: 2014-09-17
* License: Public Domain
=end

module JSON

  class Validator

    def load_ref_schema(parent_schema,ref)
      uri = URI.parse(ref)
      if uri.relative?
        uri = parent_schema.uri.clone

        # Check for absolute path
        path = ref.split("#")[0]

        # This is a self reference and thus the schema does not need to be
        # re-loaded
        if path.nil? || path == ''
        return
        end

        if path && path[0,1] == '/'
          uri.path = Pathname.new(path).cleanpath.to_s
        else
        uri = parent_schema.uri.merge(path)
        end
        uri.fragment = ''
      end

      if Validator.schemas[uri.to_s].nil?
        schema = JSON::Schema.new(JSON::Validator.parse(open(uri.to_s.chomp('#')).read), uri, @options[:version])
        Validator.add_schema(schema)
        build_schemas(schema)
      end
    end

  end
end